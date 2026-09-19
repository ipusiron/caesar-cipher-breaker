// 基本単語リスト（フォールバック用）。重複を除いた165語。
const DEFAULT_WORDS = Object.freeze([
    'THE', 'BE', 'TO', 'OF', 'AND', 'A', 'IN', 'THAT', 'HAVE', 'I', 'IT', 'FOR', 'NOT', 'ON', 'WITH',
    'HE', 'AS', 'YOU', 'DO', 'AT', 'THIS', 'BUT', 'HIS', 'BY', 'FROM', 'THEY', 'WE', 'SAY', 'HER',
    'SHE', 'OR', 'AN', 'WILL', 'MY', 'ONE', 'ALL', 'WOULD', 'THERE', 'THEIR', 'WHAT', 'SO', 'UP',
    'OUT', 'IF', 'ABOUT', 'WHO', 'GET', 'WHICH', 'GO', 'ME', 'WHEN', 'MAKE', 'CAN', 'LIKE', 'TIME',
    'NO', 'JUST', 'HIM', 'KNOW', 'TAKE', 'PEOPLE', 'INTO', 'YEAR', 'YOUR', 'GOOD', 'SOME', 'COULD',
    'THEM', 'SEE', 'OTHER', 'THAN', 'THEN', 'NOW', 'LOOK', 'ONLY', 'COME', 'ITS', 'OVER', 'THINK',
    'ALSO', 'BACK', 'AFTER', 'USE', 'TWO', 'HOW', 'OUR', 'WORK', 'FIRST', 'WELL', 'WAY', 'EVEN',
    'NEW', 'WANT', 'BECAUSE', 'ANY', 'THESE', 'GIVE', 'DAY', 'MOST', 'US', 'IS', 'WAS', 'ARE',
    'BEEN', 'HAS', 'HAD', 'WERE', 'SAID', 'EACH', 'DOES', 'OLD', 'CALL', 'MADE', 'WATER',
    'LONG', 'LITTLE', 'VERY', 'WORDS', 'CALLED', 'WHERE', 'LINE', 'RIGHT', 'TOO', 'MEANS', 'THREE',
    'CAME', 'HELP', 'THROUGH', 'MUCH', 'BEFORE', 'MOVE', 'SAME', 'TELL', 'SET', 'THOSE', 'TURN',
    'HERE', 'WHY', 'ASKED', 'WENT', 'MEN', 'READ', 'NEED', 'LAND', 'DIFFERENT', 'HOME', 'MUST',
    'BIG', 'HIGH', 'SUCH', 'FOLLOW', 'ACT', 'LARGE', 'OWN', 'PAGE', 'SHOULD', 'COUNTRY', 'FOUND',
    'ANSWER', 'SCHOOL', 'HELLO', 'JAPAN', 'WORLD', 'HAPPY', 'HACKING'
]);

// 英語文字頻度（百分率）。合計99.999を再正規化せず使用する。
const ENGLISH_FREQ = Object.freeze({
    A: 8.167, B: 1.492, C: 2.782, D: 4.253, E: 12.702, F: 2.228, G: 2.015,
    H: 6.094, I: 6.966, J: 0.153, K: 0.772, L: 4.025, M: 2.406, N: 6.749,
    O: 7.507, P: 1.929, Q: 0.095, R: 5.987, S: 6.327, T: 9.056, U: 2.758,
    V: 0.978, W: 2.360, X: 0.150, Y: 1.974, Z: 0.074
});

function caesarDecrypt(text, shift) {
    const key = ((shift % 26) + 26) % 26;
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c >= 65 && c <= 90) {
            result += String.fromCharCode((c - 65 - key + 26) % 26 + 65);
        } else if (c >= 97 && c <= 122) {
            result += String.fromCharCode((c - 97 - key + 26) % 26 + 97);
        } else {
            result += text[i];
        }
    }
    return result;
}

function caesarEncrypt(text, shift) {
    return caesarDecrypt(text, -shift);
}

function chiSquared(text) {
    const letters = text.toUpperCase().match(/[A-Z]/g) || [];
    if (letters.length === 0) return null;
    const counts = {};
    for (const letter of letters) counts[letter] = (counts[letter] || 0) + 1;
    return Object.entries(ENGLISH_FREQ).reduce((sum, [letter, frequency]) => {
        const expected = letters.length * frequency / 100;
        return sum + ((counts[letter] || 0) - expected) ** 2 / expected;
    }, 0);
}

function isChiReliable(text) {
    return (text.toUpperCase().match(/[A-Z]/g) || []).length >= 30;
}

// 元の単語区切りと完全一致の規則を維持し、HTMLではなくセグメントを返す。
function splitForHighlight(text, vocabSet) {
    return text.split(/(\s+|[,.!?;:"'()\[\]{}]+)/).filter(part => part.length > 0).map(part => ({
        text: part,
        isMatch: /\S/.test(part) && vocabSet.has(part.toUpperCase())
    }));
}

function countWordMatches(text, vocabSet) {
    const matchedWords = new Set(); // 重複カウント防止
    for (const part of splitForHighlight(text, vocabSet)) {
        if (part.isMatch) matchedWords.add(part.text.toUpperCase());
    }
    return matchedWords.size;
}

/** 画面用の25候補を順位順で返す。nullスコアは数値スコアより後に置く。 */
function rankShifts(cipherText, vocabSet) {
    const results = [];
    for (let shift = 1; shift <= 25; shift++) {
        const text = caesarDecrypt(cipherText, shift);
        results.push({ shift, text, matchCount: countWordMatches(text, vocabSet), chiSquare: chiSquared(text) });
    }
    const criterion = /\s/.test(cipherText) && results.some(result => result.matchCount > 0) ? 'words' : 'chi';
    results.sort((a, b) => {
        if (criterion === 'words' && a.matchCount !== b.matchCount) return b.matchCount - a.matchCount;
        const first = a.chiSquare ?? Infinity;
        const second = b.chiSquare ?? Infinity;
        return first === second ? a.shift - b.shift : first - second;
    });
    results.slice(0, 3).forEach((result, index) => { result.rank = index + 1; });
    return { results, criterion };
}

function parseWordlist(content) {
    return content.split(/\r?\n/).map(word => word.trim().toUpperCase()).filter(word => word.length > 0);
}

// Semantic Candidate Rankerの既存形式。シフト0も含み、区切りはLFの空行。
function buildSemanticExport(cipherText) {
    const blocks = [];
    for (let shift = 0; shift <= 25; shift++) {
        blocks.push("shift=" + shift + "\n" + caesarDecrypt(cipherText, shift));
    }
    return blocks.join("\n\n");
}

globalThis.CaesarLogic = {
    DEFAULT_WORDS, ENGLISH_FREQ, caesarDecrypt, caesarEncrypt, chiSquared, isChiReliable,
    splitForHighlight, countWordMatches, rankShifts, parseWordlist, buildSemanticExport
};
if (typeof module === 'object' && module.exports) module.exports = CaesarLogic;
