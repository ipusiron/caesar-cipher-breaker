const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const logic = require('../caesar-logic.js');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const initial = html.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1];
const external = logic.parseWordlist(fs.readFileSync(path.join(__dirname, '../wordlist.txt'), 'utf8'));
const builtIn = new Set(logic.DEFAULT_WORDS);
const combined = new Set([...builtIn, ...external]);
const continuous = 'LWLVLPSRVVLEOHWRVDBKRZILUVWWKHLGHDHQWHUHGPBEUDLQEXWRQFHFRQFHLYHGLWKDXQWHGPHGDBDQGQLJKW';

for (const [cipher, plain] of [['KHOOR MDSDQ', 'HELLO JAPAN'], ['KHOORMDSDQ', 'HELLOJAPAN']]) {
    test(`既知解答: ${cipher} / shift=3`, () => {
        assert.equal(logic.caesarDecrypt(cipher, 3), plain);
    });
}

for (let shift = 0; shift <= 25; shift++) {
    test(`往復: shift=${shift} / 大小英字・数字・記号・日本語・絵文字`, () => {
        const original = 'Abc XYZ xyz 123 !? 日本語😀🚀\nHello';
        assert.equal(logic.caesarDecrypt(logic.caesarEncrypt(original, shift), shift), original);
    });
}

for (const value of ['', '123!? 日本語😀', 'AaZz']) {
    test(`境界: ${JSON.stringify(value)} / shift=0と26`, () => {
        assert.equal(logic.caesarDecrypt(value, 0), value);
        assert.equal(logic.caesarDecrypt(value, 26), value);
    });
}

test('非英字はシフト3でも変わらず、負のシフトも正規化する', () => {
    assert.equal(logic.caesarDecrypt('123!? 日本語😀', 3), '123!? 日本語😀');
    assert.equal(logic.caesarDecrypt('Abz', -1), 'Bca');
});

test('parseWordlist: CRLF・空行・前後空白・大小文字、重複行を保持', () => {
    assert.deepEqual(logic.parseWordlist(' hello\r\n\nWorld\nHELLO \n'), ['HELLO', 'WORLD', 'HELLO']);
    assert.deepEqual(logic.parseWordlist(' \n'), []);
});

test('内蔵辞書165語は重複しない', () => {
    assert.equal(logic.DEFAULT_WORDS.length, 165);
    assert.equal(builtIn.size, 165);
});

test('ハイライトは元の文字列を保持し、マッチ数はユニーク語数', () => {
    const text = 'Hello, HELLO! (Japan)\n<img src=x>😀';
    const parts = logic.splitForHighlight(text, combined);
    assert.equal(parts.map(part => part.text).join(''), text);
    assert.deepEqual(parts.filter(part => part.isMatch).map(part => part.text), ['Hello', 'HELLO', 'Japan']);
    assert.equal(logic.countWordMatches(text, combined), 2);
    assert.equal(logic.countWordMatches('HELLOJAPAN', combined), 0);
});

test('初期値109文字・英字86文字は指定暗号文と一致する', () => {
    assert.equal(initial.length, 109);
    assert.equal(initial.replace(/[^A-Z]/g, ''), continuous);
});

for (const [shift, score] of [[3, '14.63'], [15, '247.84']]) {
    test(`初期暗号文: shift=${shift}のカイ二乗=${score}`, () => {
        assert.equal(logic.chiSquared(logic.caesarDecrypt(initial, shift)).toFixed(2), score);
    });
}

const cases = [
    ['初期値・内蔵', initial, builtIn, 3, 12, 'words', '14.63'],
    ['初期値・合併', initial, combined, 3, 16, 'words', '14.63'],
    ['空白あり短文', 'KHOOR MDSDQ', combined, 3, 2, 'words', null],
    ['空白なし長文', continuous, combined, 3, 0, 'chi', '14.63'],
    ['空白なし短文の限界', 'KHOORMDSDQ', combined, 25, 0, 'chi', '23.64']
];
for (const [name, cipher, vocab, shift, matches, criterion, score] of cases) {
    test(`A-4ランキング: ${name}`, () => {
        const result = logic.rankShifts(cipher, vocab);
        assert.equal(result.criterion, criterion);
        assert.equal(result.results[0].shift, shift);
        assert.equal(result.results[0].matchCount, matches);
        if (score !== null) assert.equal(result.results[0].chiSquare.toFixed(2), score);
        assert.deepEqual(result.results.slice(0, 3).map(row => row.rank), [1, 2, 3]);
        assert.ok(result.results.slice(3).every(row => row.rank === undefined));
        assert.deepEqual(result.results.map(row => row.shift).sort((a, b) => a - b), Array.from({ length: 25 }, (_, i) => i + 1));
    });
}

test('エクスポートは全26ブロック、shift=0から25までLF区切り', () => {
    const blocks = logic.buildSemanticExport('KHOOR MDSDQ').split('\n\n');
    assert.equal(blocks.length, 26);
    blocks.forEach((block, shift) => {
        assert.equal(block, `shift=${shift}\n${logic.caesarDecrypt('KHOOR MDSDQ', shift)}`);
    });
    assert.equal(blocks[0], 'shift=0\nKHOOR MDSDQ');
    assert.equal(blocks[1], 'shift=1\nJGNNQ LCRCP');
    assert.equal(blocks[2], 'shift=2\nIFMMP KBQBO');
});
