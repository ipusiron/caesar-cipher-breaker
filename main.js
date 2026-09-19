// 復号・採点はDOMに依存しないCaesarLogicへ委譲する。
let commonWords = new Set(CaesarLogic.DEFAULT_WORDS);
let wordlistSource = "内蔵のみ";
let isWordlistLoaded = false;
let toastTimeout;

// 最新の暗号文を保持（エクスポート用）
let lastCipherText = "";

// ページ読み込み時にwordlist.txtの読み込みを試行
window.onload = async function() {
    initTheme();

    // イベントリスナーを追加
    document.getElementById('decryptBtn').addEventListener('click', decrypt);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
    document.getElementById('copySemanticBtn').addEventListener('click', copyForSemanticRanking);
    await loadWordlist();
};

async function loadWordlist() {
    isWordlistLoaded = false;
    const button = document.getElementById('decryptBtn');
    button.disabled = true;
    try {
        if (location.protocol === 'file:') {
            wordlistSource = "内蔵のみ／file://のため外部辞書は読み込みません";
            return;
        }
        const response = await fetch('wordlist.txt');
        if (!response.ok) {
            throw new Error('wordlist.txtが見つかりません');
        }
        const content = await response.text();
        const externalWords = CaesarLogic.parseWordlist(content);
        
        if (externalWords.length > 0) {
            // 内蔵単語と外部単語を合併
            const combinedWords = new Set([...CaesarLogic.DEFAULT_WORDS, ...externalWords]);
            commonWords = combinedWords;
            wordlistSource = "内蔵 + 外部ファイル";
        } else {
            throw new Error('wordlist.txtが空です');
        }
    } catch (error) {
        // 内蔵リストのみ使用
        commonWords = new Set(CaesarLogic.DEFAULT_WORDS);
        wordlistSource = "内蔵のみ";
    } finally {
        isWordlistLoaded = true;
        button.disabled = false;
        console.log('単語リスト（' + commonWords.size + '語）：' + wordlistSource);
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
        showToast("暗号文を入力してください", true);
        return;
    }

    if (!isWordlistLoaded) {
        showToast("単語リストの読み込み中です。少々お待ちください。", true);
        return;
    }

    // エクスポート用に暗号文を保存
    lastCipherText = text;

    const results = document.getElementById("results");
    results.replaceChildren();

    // コピーボタンを表示
    document.getElementById("copySemanticBtn").hidden = false;
    const ranking = CaesarLogic.rankShifts(text, commonWords);
    const topCandidate = ranking.results[0];

    const statsDiv = document.createElement("div");
    statsDiv.className = "stats";
    
    const heading = document.createElement('h2');
    heading.textContent = '📊 解読統計';
    statsDiv.appendChild(heading);
    const fields = [
        ['入力文字数', text.length + '文字'],
        ['単語リスト', wordlistSource + '（' + commonWords.size + '語）'],
        ['最有力候補', '鍵 = ' + topCandidate.shift + ' (' + topCandidate.matchCount + '語マッチ)'],
        ['判定基準', ranking.criterion === 'words' ? '単語リストとの一致数' : '英語文字頻度（カイ二乗）']
    ];
    for (const [label, value] of fields) {
        const paragraph = document.createElement('p');
        const strong = document.createElement('strong');
        strong.textContent = label + ': ';
        paragraph.append(strong, document.createTextNode(value));
        statsDiv.appendChild(paragraph);
    }
    const warnings = [];
    if (!/\s/.test(text)) warnings.push('空白なしのため単語マッチが使えず、英語文字頻度で判定しています。');
    if (ranking.criterion === 'chi' && !CaesarLogic.isChiReliable(text)) {
        warnings.push('英字が30字未満のため、頻度による判定の信頼性は低いです。');
    }
    if (topCandidate.chiSquare === null) warnings.push('英字がないためカイ二乗は算出できません。');
    for (const warning of warnings) {
        const paragraph = document.createElement('p');
        paragraph.className = 'warning';
        paragraph.textContent = '⚠️ ' + warning;
        statsDiv.appendChild(paragraph);
    }
    results.appendChild(statsDiv);

    for (let shift = 1; shift <= 25; shift++) {
        const result = ranking.results.find(candidate => candidate.shift === shift);
        const div = document.createElement("div");
        div.className = "result-block";

        div.dataset.shift = shift;
        const keyInfo = document.createElement('div');
        keyInfo.className = 'key-info';
        keyInfo.textContent = '鍵 = ' + shift + ' ';
        if (result.rank) {
            const rankNum = result.rank;
            const badge = document.createElement('span');
            badge.className = 'ranking-badge rank-' + rankNum;
            badge.textContent = '候補 ' + rankNum;
            keyInfo.appendChild(badge);
            div.classList.add(['top-candidate', 'second-candidate', 'third-candidate'][rankNum - 1]);
        }
        const plaintext = document.createElement('div');
        plaintext.appendChild(highlightWords(result.text));
        const wordCount = document.createElement('div');
        wordCount.className = 'word-count';
        const score = result.chiSquare === null ? '算出不可（英字なし）' : result.chiSquare.toFixed(2);
        wordCount.textContent = 'マッチした単語数: ' + result.matchCount + '／カイ二乗: ' + score;
        div.append(keyInfo, plaintext, wordCount);
        
        results.appendChild(div);
    }
}

function clearResults() {
    document.getElementById("results").replaceChildren();
    document.getElementById("copySemanticBtn").hidden = true;
    lastCipherText = "";
}

// Semantic Ranking用のブロック形式でコピー
async function copyForSemanticRanking() {
    if (!lastCipherText) {
        showToast("先に解読を実行してください", true);
        return;
    }

    // 全26シフト（0-25）を空行で区切って結合（LF使用）
    const output = CaesarLogic.buildSemanticExport(lastCipherText);

    // クリップボードにコピー
    try {
        await navigator.clipboard.writeText(output);
        showToast("Copied (Semantic Ranking format)");
    } catch (error) {
        // フォールバック: textareaを使用
        const textarea = document.createElement("textarea");
        textarea.value = output;
        textarea.className = "clipboard-fallback";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            if (!document.execCommand("copy")) throw new Error('Copy unavailable');
            showToast("Copied (Semantic Ranking format)");
        } catch (e) {
            showToast("コピーに失敗しました", true);
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
    document.getElementById('themeToggleBtn').setAttribute('aria-pressed', String(theme === 'dark'));
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}
