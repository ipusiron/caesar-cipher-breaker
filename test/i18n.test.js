const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repositoryRoot = path.resolve(__dirname, '..');
const I18n = require(path.join(repositoryRoot, 'i18n.js'));
const read = file => fs.readFileSync(path.join(repositoryRoot, file), 'utf8');
const html = read('index.html');
const main = read('main.js');

test('日本語と英語で、キーの集合が同じ', () => {
    const ja = Object.keys(I18n.ja).sort();
    const en = Object.keys(I18n.en).sort();
    assert.deepEqual(ja.filter(key => !(key in I18n.en)), [], '英語に無いキーがある');
    assert.deepEqual(en.filter(key => !(key in I18n.ja)), [], '日本語に無いキーがある');
});

test('差し込みの名前が、日本語と英語で一致する', () => {
    const holes = value => [...String(value).matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
    const mismatched = Object.keys(I18n.ja).filter(key => holes(I18n.ja[key]) !== holes(I18n.en[key]));
    assert.deepEqual(mismatched, []);
});

test('index.html が指すキーは、すべて辞書にある', () => {
    const keys = new Set();
    for (const match of html.matchAll(/data-i18n(?:-[a-z-]+)?="([^"]+)"/g)) keys.add(match[1]);
    assert.ok(keys.size >= 12, `data-i18n が少なすぎる: ${keys.size}`);
    assert.deepEqual([...keys].filter(key => !(key in I18n.ja)), []);
});

test('main.js が呼ぶキーは、すべて辞書にある', () => {
    const keys = new Set();
    for (const match of main.matchAll(/I18n\.t\(\s*['"]([\w.]+)['"]/g)) keys.add(match[1]);
    const indirect = /['"](wordlist\.(?:builtin|combined|fileProtocol)|warn\.\w+|theme\.to\w+|stats\.criterion\w*)['"]/g;
    for (const match of main.matchAll(indirect)) keys.add(match[1]);
    assert.ok(keys.size >= 20, `I18n.t の呼び出しが少なすぎる: ${keys.size}`);
    assert.deepEqual([...keys].filter(key => !(key in I18n.ja)), []);
});

test('英語の辞書に、訳し忘れの日本語が残っていない', () => {
    const japanese = /[぀-ヿ一-鿿]/;
    // 言語の切り替えボタンだけは、相手の言語を出すのが正しい
    const expected = new Set(['app.langButton']);
    assert.deepEqual(Object.keys(I18n.en).filter(key => !expected.has(key) && japanese.test(I18n.en[key])), []);
});

test('t() は差し込みを埋める。知らないキーは黙って通さない', () => {
    assert.equal(I18n.t('result.key', { shift: 3 }), '鍵 = 3');
    assert.equal(I18n.t('result.score', { matches: 16, chi: '14.63' }), 'マッチした単語数: 16／カイ二乗: 14.63');
    assert.match(I18n.t('stats.wordlistValue', { source: I18n.t('wordlist.combined'), count: 1473 }), /1473/);
    assert.throws(() => I18n.t('no.such.key'), /Unknown message/);
});

test('setLanguage と init で、英語に切り替わる', () => {
    const applied = [];
    global.document = {
        documentElement: { lang: 'ja' },
        title: '',
        querySelector: () => null,
        querySelectorAll: () => applied,
        dispatchEvent: () => true
    };
    global.Event = class { constructor(type) { this.type = type; } };
    global.localStorage = {
        store: {},
        getItem(key) { return Object.hasOwn(this.store, key) ? this.store[key] : null; },
        setItem(key, value) { this.store[key] = value; }
    };
    global.location = { search: '' };
    try {
        I18n.setLanguage('en');
        assert.equal(I18n.language, 'en');
        assert.equal(I18n.t('result.key', { shift: 3 }), 'Key = 3');
        assert.equal(global.localStorage.store['caesar-cipher-breaker-language'], 'en');
        I18n.setLanguage('fr');
        assert.equal(I18n.language, 'en', '未対応の言語は無視する');
        I18n.init();
        assert.equal(I18n.language, 'en', '保存値を読み戻す');
        assert.equal(document.documentElement.lang, 'en');
        assert.equal(document.title, 'Caesar Cipher Breaker');
    } finally {
        I18n.setLanguage('ja');
        delete global.document;
        delete global.Event;
        delete global.localStorage;
        delete global.location;
    }
});

test('main.js の文言はすべて辞書に出してある', () => {
    // コメントを除いたコードに、日本語の文言が残っていない
    const code = main.replace(/^[ \t]*\/\/.*$/gm, '').replace(/([^:])\/\/.*$/gm, '$1');
    const lines = code.split(/\r?\n/).filter(line => /[぀-ヿ一-鿿]/.test(line));
    assert.deepEqual(lines, []);
});

test('辞書の出所を、表示中の文言との一致で判定していない', () => {
    // 言語を切り替えると文言が変わるため、辞書キーで保持する
    assert.doesNotMatch(main, /wordlistSource/);
    assert.match(main, /wordlistSourceKey = "wordlist\.builtin"/);
    assert.match(main, /I18n\.t\(wordlistSourceKey\)/);
});

test('結果一覧は languagechange で描き直す', () => {
    assert.match(main, /addEventListener\('languagechange'/);
    assert.match(main, /if \(lastCipherText\) renderResults\(lastCipherText\)/);
    assert.match(main, /function renderResults\(text\)/);
});

test('テーマボタンの読み上げは、切り替わる先を示す', () => {
    assert.match(main, /I18n\.t\(isDark \? 'theme\.toLight' : 'theme\.toDark'\)/);
    assert.match(main, /button\.setAttribute\('aria-label', label\)/);
    assert.match(main, /button\.setAttribute\('title', label\)/);
});

test('i18n.js を最初に読み込み、noscript は日英を併記する', () => {
    assert.ok(html.indexOf('<script src="i18n.js"') < html.indexOf('<script src="caesar-logic.js"'));
    const noscript = html.match(/<noscript>([^<]*)<\/noscript>/);
    assert.ok(noscript);
    assert.match(noscript[1], /JavaScript/);
    assert.match(noscript[1], /JavaScriptが必要/);
});

test('子要素を持つ要素に data-i18n を付けていない', () => {
    // apply() は textContent を置き換えるため、中に要素があると消える
    for (const match of html.matchAll(/<(\w+)[^>]*\sdata-i18n="[^"]+"[^>]*>([\s\S]*?)<\/\1>/g)) {
        assert.doesNotMatch(match[2], /</, `${match[1]} に子要素がある`);
    }
});

test('README は日英を相互にリンクし、英語版が実在する', () => {
    assert.match(read('README.md'), /^\[English\]\(README\.en\.md\) · 日本語$/m);
    const english = read('README.en.md');
    assert.match(english, /^English · \[日本語\]\(README\.md\)$/m);
    assert.ok(english.includes('## 🧪 Tests'));
    assert.ok(english.includes('i18n.js'));
});
