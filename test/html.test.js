const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const main = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');

test('viewport・CSP・referrer・favicon・noscript', () => {
    assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1.0">/);
    const csp = html.match(/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/);
    assert.ok(csp);
    for (const rule of ["script-src 'self'", "style-src 'self'", "base-uri 'self'", "object-src 'none'", "form-action 'self'"]) {
        assert.ok(csp[1].includes(rule), rule);
    }
    assert.doesNotMatch(csp[1], /frame-ancestors|unsafe-inline|unsafe-eval/);
    assert.match(html, /<meta name="referrer" content="no-referrer">/);
    assert.match(html, /<link rel="icon" href="data:,">/);
    assert.match(html, /<noscript>[^<]*JavaScript[^<]*<\/noscript>/);
});

test('古典スクリプト2本はdefer付きでロジック→DOMの順', () => {
    const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map(match => match[0]);
    assert.deepEqual(scripts, ['<script src="caesar-logic.js" defer>', '<script src="main.js" defer>']);
    assert.doesNotMatch(html, /\stype\s*=\s*["']module["']/i);
});

test('インラインイベント・style・危険なDOM文字列代入なし', () => {
    assert.doesNotMatch(html, /\son\w+\s*=/i);
    assert.doesNotMatch(html, /\sstyle\s*=/i);
    assert.doesNotMatch(main, /innerHTML|document\.write|\balert\s*\(|escapeHtml|escapeRegex/);
});

test('必須ID・label・live領域・テーマの読み上げ・初期disabledとhidden', () => {
    for (const id of ['cipherText', 'decryptBtn', 'clearBtn', 'copySemanticBtn', 'results', 'toast', 'themeToggleBtn']) {
        assert.equal([...html.matchAll(new RegExp(`id="${id}"`, 'g'))].length, 1, id);
    }
    assert.match(html, /<label for="cipherText">/);
    assert.match(html, /<div id="results" aria-live="polite">/);
    assert.match(html, /<div id="toast"[^>]*role="status"[^>]*aria-live="polite">/);
    assert.match(html, /<button[^>]*id="themeToggleBtn"[^>]*aria-label="[^"]+"[^>]*aria-pressed="false">/);
    assert.match(html, /<button id="decryptBtn"[^>]*\bdisabled>/);
    assert.match(html, /<button id="copySemanticBtn"[^>]*\bhidden>/);
});

test('外部リンクすべてにnoopener noreferrer', () => {
    const links = [...html.matchAll(/<a\b[^>]*href="https?:[^>]+>/g)];
    assert.equal(links.length, 2);
    for (const [link] of links) assert.match(link, /rel="noopener noreferrer"/);
});

test('統計はh2、CSSOM表示切り替えを使わずhiddenで制御', () => {
    assert.match(main, /createElement\('h2'\)/);
    assert.doesNotMatch(main, /createElement\(['"]h4['"]\)|\.style\.display/);
    assert.match(main, /\.hidden = false/);
    assert.match(main, /\.hidden = true/);
});

test('npm依存なし・CommonJS・CIはpushとPR、Node22、read権限', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));
    assert.deepEqual(pkg, { name: 'caesar-cipher-breaker', private: true, scripts: { test: 'node --test' } });
    const workflow = fs.readFileSync(path.join(__dirname, '../.github/workflows/test.yml'), 'utf8');
    for (const text of ['push:', 'pull_request:', 'contents: read', 'actions/checkout@v4', 'actions/setup-node@v4', 'node-version: 22', 'npm test']) {
        assert.ok(workflow.includes(text), text);
    }
});
