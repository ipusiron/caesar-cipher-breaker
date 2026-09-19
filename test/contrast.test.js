const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const css = fs.readFileSync(path.join(__dirname, '../style.css'), 'utf8');

function variables(selector) {
    const block = css.match(selector);
    assert.ok(block, 'CSS変数ブロックが存在する');
    return Object.fromEntries([...block[1].matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(match => [match[1], match[2].trim()]));
}

function luminance(value) {
    // 既存CSSのwhiteと3桁hexも、意味を変えず数値化する。
    let hex = value === 'white' ? '#ffffff' : value;
    if (/^#[\da-f]{3}$/i.test(hex)) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
    assert.match(hex || '', /^#[\da-f]{6}$/i, `有効な色: ${value}`);
    const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
    const linear = channels.map(c => c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
}

const light = variables(/:root\s*\{([^}]+)\}/);
const dark = { ...light, ...variables(/\[data-theme="dark"\]\s*\{([^}]+)\}/) };
const pairs = [];
for (const background of ['--result-bg', '--top-candidate-bg', '--second-candidate-bg', '--third-candidate-bg']) {
    for (const foreground of ['--muted-text', '--match-color', '--text-color']) pairs.push([foreground, background]);
}
pairs.push(
    ['--link-color', '--info-bg'], ['--link-color', '--container-bg'],
    ['--button-text', '--button-bg'], ['--button-text', '--button-hover'],
    ['--button-disabled-text', '--button-disabled-bg'],
    ['--rank-text', '--rank1-bg'], ['--rank-text', '--rank2-bg'], ['--rank3-text', '--rank3-bg'],
    ['--heading-color', '--container-bg'], ['--text-color', '--stats-bg'],
    ['--text-color', '--info-bg'], ['--text-color', '--input-bg'], ['--text-color', '--container-bg']
);

for (const [theme, colors] of [['light', light], ['dark', dark]]) {
    for (const [foreground, background] of pairs) {
        test(`${theme}: ${foreground} / ${background} >= 4.5`, () => {
            assert.ok(Object.hasOwn(colors, foreground), foreground);
            assert.ok(Object.hasOwn(colors, background), background);
            const a = luminance(colors[foreground]);
            const b = luminance(colors[background]);
            const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
            assert.ok(ratio >= 4.5, `${theme} ${foreground}/${background} = ${ratio.toFixed(4)}`);
        });
    }
}

test('統計h2はheading-colorを使わずtext-color、マッチは太字と下線', () => {
    assert.match(css, /\.stats h2\s*\{[^}]*color: var\(--text-color\)/);
    assert.match(css, /\.match-word\s*\{[^}]*font-weight: bold;[^}]*text-decoration: underline;/);
});
