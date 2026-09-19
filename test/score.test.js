const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const logic = require('../caesar-logic.js');
const initial = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8').match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1];
const vocab = new Set([...logic.DEFAULT_WORDS, ...logic.parseWordlist(fs.readFileSync(path.join(__dirname, '../wordlist.txt'), 'utf8'))]);

test('英語頻度はA〜Zの26個、合計100±0.01', () => {
    assert.equal(Object.keys(logic.ENGLISH_FREQ).join(''), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    assert.ok(Math.abs(Object.values(logic.ENGLISH_FREQ).reduce((a, b) => a + b, 0) - 100) < 0.01);
});

test('英字0文字はnull、大小文字・記号はスコアに影響しない', () => {
    assert.equal(logic.chiSquared(''), null);
    assert.equal(logic.chiSquared('123 日本語😀'), null);
    assert.equal(logic.chiSquared('aBc'), logic.chiSquared('A B!C123'));
});

for (const [length, reliable] of [[0, false], [29, false], [30, true], [86, true]]) {
    test(`信頼性境界: 英字${length}字=${reliable}`, () => {
        assert.equal(logic.isChiReliable('a'.repeat(length) + ' 日本語123😀'), reliable);
    });
}

test('wordsはマッチ数優先、同数はカイ二乗優先', () => {
    const result = logic.rankShifts(initial, vocab);
    assert.equal(result.criterion, 'words');
    assert.equal(result.results[0].shift, 3);
    assert.equal(result.results[0].matchCount, 16);
    result.results.slice(1).forEach((row, i) => {
        const previous = result.results[i];
        assert.ok(previous.matchCount >= row.matchCount);
        if (previous.matchCount === row.matchCount) assert.ok(previous.chiSquare <= row.chiSquare);
    });
    const forced = logic.rankShifts('B C', new Set(['A', 'B', 'X']));
    assert.equal(forced.criterion, 'words');
    assert.equal(forced.results[0].shift, 1);
    assert.equal(forced.results[0].matchCount, 2);
});

test('空白ありでも全件マッチ0ならchi、空白なしはマッチがあってもchi', () => {
    const zero = logic.rankShifts(initial, new Set());
    assert.equal(zero.criterion, 'chi');
    assert.equal(zero.results[0].shift, 3);
    assert.equal(zero.results[0].chiSquare.toFixed(2), '14.63');
    assert.equal(zero.results[1].shift, 15);
    assert.equal(zero.results[1].chiSquare.toFixed(2), '247.84');
    const short = logic.rankShifts('KHOORMDSDQ', new Set(['HELLOJAPAN']));
    assert.equal(short.criterion, 'chi');
    assert.equal(short.results[0].shift, 25);
    assert.equal(short.results[0].chiSquare.toFixed(2), '23.64');
});

test('同一カイ二乗ではシフト昇順、nullでも上位3件を付ける', () => {
    for (const cipher of ['ABCDEFGHIJKLMNOPQRSTUVWXYZ', '123 日本語']) {
        const result = logic.rankShifts(cipher, new Set());
        assert.equal(result.criterion, 'chi');
        assert.deepEqual(result.results.map(row => row.shift), Array.from({ length: 25 }, (_, i) => i + 1));
        assert.deepEqual(result.results.slice(0, 3).map(row => row.rank), [1, 2, 3]);
    }
});

test('wordsでも完全同点はシフト昇順', () => {
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const allRotations = new Set(Array.from({ length: 26 }, (_, i) => logic.caesarDecrypt(alphabet, i)));
    const result = logic.rankShifts(alphabet + ' ', allRotations);
    assert.equal(result.criterion, 'words');
    assert.deepEqual(result.results.map(row => row.shift), Array.from({ length: 25 }, (_, i) => i + 1));
});

test('READMEの限定例: 初期暗号文の英字15〜86字の各接頭辞は鍵3が1位', () => {
    const letters = initial.replace(/[^A-Z]/g, '');
    for (let length = 15; length <= letters.length; length++) {
        assert.equal(logic.rankShifts(letters.slice(0, length), new Set()).results[0].shift, 3, `${length}字`);
    }
});
