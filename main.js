// 復号・採点はDOMに依存しないCaesarLogicへ委譲する。
let commonWords = new Set(CaesarLogic.DEFAULT_WORDS);
// 表示中の文言ではなく辞書キーで保持する。言語を切り替えても状態が壊れない。
let wordlistSourceKey = "wordlist.builtin";
let isWordlistLoaded = false;
let toastTimeout;

// 最新の暗号文を保持（エクスポートと言語切り替え時の再描画用）
let lastCipherText = "";

// ページ読み込み時にwordlist.txtの読み込みを試行
window.onload = async function() {
    I18n.init();
    initTheme();

    // イベントリスナーを追加
    document.getElementById('decryptBtn').addEventListener('click', decrypt);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('copySemanticBtn').addEventListener('click', copyForSemanticRanking);
    document.getElementById('langToggleBtn').addEventListener('click', function() {
        I18n.setLanguage(I18n.language === 'ja' ? 'en' : 'ja');
    });
    // 結果一覧は動的に組むため、言語が変わったら同じ暗号文で描き直す。
    document.addEventListener('languagechange', function() {
        updateThemeIcon(document.documentElement.getAttribute('data-theme'));
        if (lastCipherText) renderResults(lastCipherText);
    });
    await loadWordlist();
};

async function loadWordlist() {
    isWordlistLoaded = false;
    const button = document.getElementById('decryptBtn');
    button.disabled = true;
    try {
        if (location.protocol === 'file:') {
            wordlistSourceKey = "wordlist.fileProtocol";
            return;
        }
        const response = await fetch('wordlist.txt');
        if (!response.ok) {
            throw new Error('wordlist.txt not found');
        }
        const content = await response.text();
        const externalWords = CaesarLogic.parseWordlist(content);

        if (externalWords.length > 0) {
            // 内蔵単語と外部単語を合併
            const combinedWords = new Set([...CaesarLogic.DEFAULT_WORDS, ...externalWords]);
            commonWords = combinedWords;
            wordlistSourceKey = "wordlist.combined";
        } else {
            throw new Error('wordlist.txt is empty');
        }
    } catch (error) {
        // 内蔵リストのみ使用
        commonWords = new Set(CaesarLogic.DEFAULT_WORDS);
        wordlistSourceKey = "wordlist.builtin";
    } finally {
        isWordlistLoaded = true;
        button.disabled = false;
        console.log(I18n.t('console.wordlist', { count: commonWords.size, source: I18n.t(wordlistSourceKey) }));
    }
}

function highlightWords(text) {
    const fragment = document.createDocumentFragment();
    CaesarLogic.splitForHighlight(text, commonWords).forEach(part => {
        const span = document.createElement('span');
        span.textContent = part.text;
        if (part.isMatch) span.className = 'match-word';
        fragment.appendChild(span);
    });
    return fragment;
}

function decrypt() {
    const text = document.getElementById("cipherText").value;
    if (!text.trim()) {
        showToast(I18n.t('toast.needText'), true);
        return;
    }

    if (!isWordlistLoaded) {
        showToast(I18n.t('toast.loading'), true);
        return;
    }

    // エクスポートと再描画のために暗号文を保存
    lastCipherText = text;
    renderResults(text);
}

// 統計と25候補を組み直す。言語切り替え後もここを通す。
function renderResults(text) {
    const results = document.getElementById("results");
    results.replaceChildren();

    // コピーボタンを表示
    document.getElementById("copySemanticBtn").hidden = false;
    const ranking = CaesarLogic.rankShifts(text, commonWords);
    const topCandidate = ranking.results[0];

    results.appendChild(buildStats(text, ranking, topCandidate));

    for (let shift = 1; shift <= 25; shift++) {
        const result = ranking.results.find(candidate => candidate.shift === shift);
        const div = document.createElement("div");
        div.className = "result-block";

        div.dataset.shift = shift;
        const keyInfo = document.createElement('div');
        keyInfo.className = 'key-info';
        keyInfo.textContent = I18n.t('result.key', { shift: shift }) + ' ';
        if (result.rank) {
            const rankNum = result.rank;
            const badge = document.createElement('span');
            badge.className = 'ranking-badge rank-' + rankNum;
            badge.textContent = I18n.t('result.badge', { rank: rankNum });
            keyInfo.appendChild(badge);
            div.classList.add(['top-candidate', 'second-candidate', 'third-candidate'][rankNum - 1]);
        }
        const plaintext = document.createElement('div');
        plaintext.appendChild(highlightWords(result.text));
        const wordCount = document.createElement('div');
        wordCount.className = 'word-count';
        const score = result.chiSquare === null ? I18n.t('result.chiUnavailable') : result.chiSquare.toFixed(2);
        wordCount.textContent = I18n.t('result.score', { matches: result.matchCount, chi: score });
        div.append(keyInfo, plaintext, wordCount);

        results.appendChild(div);
    }
}

// 解読統計のブロックを組む。判定基準と警告は文言でなく辞書キーで選ぶ。
function buildStats(text, ranking, topCandidate) {
    const statsDiv = document.createElement("div");
    statsDiv.className = "stats";

    const heading = document.createElement('h2');
    heading.textContent = I18n.t('stats.heading');
    statsDiv.appendChild(heading);
    const source = I18n.t(wordlistSourceKey);
    const fields = [
        ['stats.length', I18n.t('stats.lengthValue', { count: text.length })],
        ['stats.wordlist', I18n.t('stats.wordlistValue', { source: source, count: commonWords.size })],
        ['stats.top', I18n.t('stats.topValue', { shift: topCandidate.shift, count: topCandidate.matchCount })],
        ['stats.criterion', I18n.t(ranking.criterion === 'words' ? 'stats.criterionWords' : 'stats.criterionChi')]
    ];
    for (const [labelKey, value] of fields) {
        const paragraph = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = I18n.t(labelKey) + ': ';
        paragraph.append(strong, document.createTextNode(value));
        statsDiv.appendChild(paragraph);
    }
    const warnings = [];
    if (!/\s/.test(text)) warnings.push('warn.noSpace');
    if (ranking.criterion === 'chi' && !CaesarLogic.isChiReliable(text)) {
        warnings.push('warn.shortText');
    }
    if (topCandidate.chiSquare === null) warnings.push('warn.noLetters');
    for (const warning of warnings) {
        const paragraph = document.createElement('p');
        paragraph.className = 'warning';
        paragraph.textContent = '⚠️ ' + I18n.t(warning);
        statsDiv.appendChild(paragraph);
    }
    return statsDiv;
}

function clearResults() {
    document.getElementById("results").replaceChildren();
    document.getElementById("copySemanticBtn").hidden = true;
    lastCipherText = "";
}

// Semantic Ranking用のブロック形式でコピー
async function copyForSemanticRanking() {
    if (!lastCipherText) {
        showToast(I18n.t('toast.needDecrypt'), true);
        return;
    }

    // 全26シフト（0-25）を空行で区切って結合（LF使用）
    const output = CaesarLogic.buildSemanticExport(lastCipherText);

    // クリップボードにコピー
    try {
        await navigator.clipboard.writeText(output);
        showToast(I18n.t('toast.copied'));
    } catch (error) {
        // フォールバック: textareaを使用
        const textarea = document.createElement("textarea");
        textarea.value = output;
        textarea.className = "clipboard-fallback";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            if (!document.execCommand("copy")) throw new Error('Copy unavailable');
            showToast(I18n.t('toast.copied'));
        } catch (e) {
            showToast(I18n.t('toast.copyFailed'), true);
        }
        textarea.remove();
    }
}

// トースト通知を表示
function showToast(message, isError) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.className = "toast" + (isError ? " toast-error" : "");
    toast.classList.add("toast-show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(function() {
        toast.classList.remove("toast-show");
    }, 2500);
}

// テーマ管理機能
function initTheme() {
    let savedTheme = 'light';
    try {
        savedTheme = localStorage.getItem('theme') === 'dark' ? 'dark' : 'light';
    } catch (error) {
        // 保存領域が無効でも画面とテーマ切り替えは使える。
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    try {
        localStorage.setItem('theme', newTheme);
    } catch (error) {
        // 保存できない環境では現在のページにだけ反映する。
    }
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const isDark = theme === 'dark';
    const button = document.getElementById('themeToggleBtn');
    button.setAttribute('aria-pressed', String(isDark));
    // 次に切り替わる先を読み上げる。以前はダーク表示中も「ダークモード切り替え」のままだった。
    const label = I18n.t(isDark ? 'theme.toLight' : 'theme.toDark');
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDark ? '☀️' : '🌙';
    }
}
