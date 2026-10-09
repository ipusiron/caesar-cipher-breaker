const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const logic = require('../caesar-logic.js');
const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const readme = read('README.md');
const words = logic.parseWordlist(read('wordlist.txt'));

test('README辞書表4行の数値は実辞書から再計算した結果と一致', () => {
    const section = readme.split('| 辞書の項目 | 数値 |')[1].split('\n\n')[0];
    const rows = [...section.matchAll(/^\| ([^|]+) \| ([\d,]+) \|$/gm)];
    assert.equal(rows.length, 4);
    const lines = read('wordlist.txt').trimEnd().split(/\r?\n/);
    const expected = [new Set(logic.DEFAULT_WORDS).size, lines.length, new Set(words).size,
        new Set([...words, ...logic.DEFAULT_WORDS]).size];
    assert.deepEqual(expected, [165, 1842, 1472, 1473]);
    assert.deepEqual(rows.map(row => Number(row[2].replaceAll(',', ''))), expected);
});

test('README復号例2行を実ロジックで検証、旧誤例が残っていない', () => {
    assert.doesNotMatch(readme, /KHOORMSDSDQ/);
    const examples = [...readme.matchAll(/^\| `([^`]+)` \| (\d+) \| `([^`]+)` \|$/gm)];
    assert.equal(examples.length, 2);
    for (const [, cipher, shift, plain] of examples) assert.equal(logic.caesarDecrypt(cipher, Number(shift)), plain);
    const exportExample = readme.match(/```\n(shift=0[\s\S]*?)\n\.\.\.\n```/);
    assert.ok(exportExample);
    assert.equal(exportExample[1], logic.buildSemanticExport('KHOOR MDSDQ').split('\n\n').slice(0, 3).join('\n\n'));
});

test('相対画像参照3枚は実在し、中央揃え', () => {
    const refs = [...readme.matchAll(/!\[[^\]]*\]\(([^)]+)\)|<img\b[^>]*src="([^"]+)"/g)]
        .map(match => match[1] || match[2]).filter(src => !/^(?:https?:|data:)/.test(src));
    assert.equal(refs.length, 3);
    for (const src of refs) assert.ok(fs.existsSync(path.join(__dirname, '..', src)), src);
    assert.equal([...readme.matchAll(/<p align="center">\s*<img/g)].length, 3);
});

test('YAMLはHTMLコメント・固定キーとブロック形式を維持', () => {
    const yaml = readme.match(/^<!--\r?\n---\r?\n([\s\S]*?)\r?\n---\r?\n-->/);
    assert.ok(yaml);
    for (const key of ['category_ja', 'category_en', 'tags']) {
        assert.match(yaml[1], new RegExp(`^${key}:\\r?\\n  - `, 'm'));
    }
    const fixed = {
        id: 'day008', slug: 'caesar-cipher-breaker', hub: 'true',
        repo_url: '"https://github.com/ipusiron/caesar-cipher-breaker"',
        demo_url: '"https://ipusiron.github.io/caesar-cipher-breaker/"'
    };
    for (const [key, value] of Object.entries(fixed)) {
        assert.equal(yaml[1].split(/\r?\n/).find(line => line.startsWith(key + ':')), `${key}: ${value}`);
    }
    const keys = [...yaml[1].matchAll(/^(\w+):/gm)].map(match => match[1]);
    assert.deepEqual(keys, ['id', 'slug', 'title', 'subtitle_ja', 'subtitle_en', 'description_ja', 'description_en',
        'category_ja', 'category_en', 'difficulty', 'tags', 'repo_url', 'demo_url', 'hub']);
});

test('シリーズ・節・関連ツール・注意書き・CLAUDEが現行仕様を説明', () => {
    assert.ok(readme.includes('Day008 - 生成AIで作るセキュリティツール100'));
    assert.ok(readme.includes('page_id=42163'));
    assert.doesNotMatch(readme, /約1,000語|gematria-cipherlab|開発予定|復号化/);
    for (const heading of ['✨ 機能', '📖 使い方', '📐 画面構成', '🎯 ユースケース', '🔬 技術的な説明',
        '🧪 テスト', '🔒 セキュリティ', '⚠️ 注意', '❓ FAQ', '🔗 参考', '💻 動作環境']) {
        assert.ok(readme.includes('## ' + heading), heading);
    }
    assert.ok(readme.includes('https://github.com/ipusiron/semantic-candidate-ranker'));
    assert.ok(readme.includes('https://ipusiron.github.io/frequency-analyzer/'));
    assert.ok(readme.includes('30字未満'));
    assert.ok(readme.includes('frame-ancestors'));
    const claude = read('CLAUDE.md');
    assert.ok(claude.includes('Day008'));
    assert.ok(claude.includes('npm test'));
    for (const name of Object.keys(logic)) assert.ok(claude.includes(name), name);
    assert.doesNotMatch(claude, /Day 7\/100|caesarShift|decryptCaesar|countEnglishWords|decryptAllShifts|KHOORMSDSDQ/);
});

test('ユースケースの「このツールならではの使い方」の数値は実ロジックで再計算した結果と一致（日英）', () => {
    const readmeEn = read('README.en.md');
    const vocab = new Set([...words, ...logic.DEFAULT_WORDS]);
    const top = text => logic.rankShifts(text, vocab).results[0].shift;
    const g = 'FOURSCOREANDSEVENYEARSAGOOURFATHERSBROUGHTFORTHONTHISCONTINENTANEWNATIONCONCEIVEDINLIBERTY';
    const c = logic.caesarEncrypt(g, 3);
    let from = 3;
    for (let n = g.length; n >= 3; n--) if (top(c.slice(0, n)) !== 3) { from = n + 1; break; }
    assert.deepEqual([g.length, from, top(c.slice(0, from - 1)) !== 3], [90, 9, true]);
    for (const part of [`空白を除いて英字${g.length}字`, `1位になるのは${from}字目からで`, `${from - 1}字までは別のシフト`]) {
        assert.ok(readme.includes(part), part);
    }
    for (const part of [`(${g.length} letters without spaces)`, `from the ${from}th letter on`, `up to ${from - 1} letters`]) {
        assert.ok(readmeEn.includes(part), part);
    }
    assert.equal(logic.isChiReliable('A'.repeat(29)), false);
    assert.equal(logic.isChiReliable('A'.repeat(30)), true);
    assert.equal(logic.caesarEncrypt('HELLO', 23), 'EBIIL');
    assert.equal(logic.caesarDecrypt('HELLO', 3), 'EBIIL');
    for (const text of [readme, readmeEn]) assert.ok(text.includes('HELLO') && text.includes('EBIIL'));
    const fox = 'BUT A FAST GRAY FOX DID JUMP ON A LAZY DOG';
    assert.ok(!fox.includes('E'));
    const enc = logic.caesarEncrypt(fox, 7);
    const letters = fox.replace(/[^A-Z]/g, '').length;
    const [noSpace, spaced] = [top(enc.replace(/ /g, '')), top(enc)];
    assert.deepEqual([letters, noSpace, spaced], [32, 19, 7]);
    const jaFox = `「${fox}」（英字${letters}字）をシフト7で暗号化し、空白を消して解かせると、頻度の1位はシフト${noSpace}になる`;
    assert.ok(readme.includes(jaFox));
    assert.ok(readmeEn.includes(`Encrypt "${fox}" (${letters} letters) with shift 7`));
    assert.ok(readmeEn.includes(`frequency puts shift ${noSpace} first`));
});
