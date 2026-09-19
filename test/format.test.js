const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const files = ['index.html', 'main.js', 'caesar-logic.js', 'style.css',
    ...fs.readdirSync(__dirname).filter(name => name.endsWith('.js')).map(name => `test/${name}`)];
const minima = { 'index.html': 45, 'main.js': 150, 'caesar-logic.js': 100, 'style.css': 250 };

for (const file of files) {
    test(`整形: ${file}の最長行と行数`, () => {
        const lines = fs.readFileSync(path.join(__dirname, '..', file), 'utf8').trimEnd().split(/\r?\n/);
        const maximum = Math.max(...lines.map(line => [...line].length));
        assert.ok(maximum <= (file === 'index.html' ? 250 : 160), `${file}: 最長${maximum}文字`);
        if (minima[file]) assert.ok(lines.length >= minima[file], `${file}: ${lines.length}行`);
    });
}
