// セキュリティ関数：HTMLエスケープ
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// セキュリティ関数：正規表現の特殊文字をエスケープ
function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 基本単語リスト（フォールバック用）
const defaultWords = [
    'THE', 'BE', 'TO', 'OF', 'AND', 'A', 'IN', 'THAT', 'HAVE', 'I', 'IT', 'FOR', 'NOT', 'ON', 'WITH',
    'HE', 'AS', 'YOU', 'DO', 'AT', 'THIS', 'BUT', 'HIS', 'BY', 'FROM', 'THEY', 'WE', 'SAY', 'HER',
    'SHE', 'OR', 'AN', 'WILL', 'MY', 'ONE', 'ALL', 'WOULD', 'THERE', 'THEIR', 'WHAT', 'SO', 'UP',
    'OUT', 'IF', 'ABOUT', 'WHO', 'GET', 'WHICH', 'GO', 'ME', 'WHEN', 'MAKE', 'CAN', 'LIKE', 'TIME',
    'NO', 'JUST', 'HIM', 'KNOW', 'TAKE', 'PEOPLE', 'INTO', 'YEAR', 'YOUR', 'GOOD', 'SOME', 'COULD',
    'THEM', 'SEE', 'OTHER', 'THAN', 'THEN', 'NOW', 'LOOK', 'ONLY', 'COME', 'ITS', 'OVER', 'THINK',
    'ALSO', 'BACK', 'AFTER', 'USE', 'TWO', 'HOW', 'OUR', 'WORK', 'FIRST', 'WELL', 'WAY', 'EVEN',
    'NEW', 'WANT', 'BECAUSE', 'ANY', 'THESE', 'GIVE', 'DAY', 'MOST', 'US', 'IS', 'WAS', 'ARE',
    'BEEN', 'HAS', 'HAD', 'WERE', 'SAID', 'EACH', 'WHICH', 'DOES', 'OLD', 'CALL', 'MADE', 'WATER',
    'LONG', 'LITTLE', 'VERY', 'WORDS', 'CALLED', 'WHERE', 'LINE', 'RIGHT', 'TOO', 'MEANS', 'THREE',
    'CAME', 'HELP', 'THROUGH', 'MUCH', 'BEFORE', 'MOVE', 'SAME', 'TELL', 'SET', 'THOSE', 'TURN',
    'HERE', 'WHY', 'ASKED', 'WENT', 'MEN', 'READ', 'NEED', 'LAND', 'DIFFERENT', 'HOME', 'MUST',
    'BIG', 'HIGH', 'SUCH', 'FOLLOW', 'ACT', 'LARGE', 'OWN', 'PAGE', 'SHOULD', 'COUNTRY', 'FOUND',
    'ANSWER', 'SCHOOL', 'HELLO', 'JAPAN', 'WORLD', 'HAPPY', 'HACKING'
];

let commonWords = new Set(defaultWords);
let wordlistSource = "内蔵のみ";
let isWordlistLoaded = true;

// ページ読み込み時にwordlist.txtの読み込みを試行
window.onload = function() {
    loadWordlist();
    initTheme();

    // イベントリスナーを追加
    document.getElementById('decryptBtn').addEventListener('click', decrypt);
    document.getElementById('clearBtn').addEventListener('click', clearResults);
    document.getElementById('themeToggleBtn').addEventListener('click', toggleTheme);
};

async function loadWordlist() {
    try {
        console.log('wordlist.txtの読み込みを試行中...');
        const response = await fetch('wordlist.txt');
        if (!response.ok) {
            throw new Error('wordlist.txtが見つかりません');
        }
        const content = await response.text();
        const externalWords = content.split('\n')
            .map(word => word.trim().toUpperCase())
            .filter(word => word.length > 0);
        
        if (externalWords.length > 0) {
            // 内蔵単語と外部単語を合併
            const combinedWords = new Set([...defaultWords, ...externalWords]);
            commonWords = combinedWords;
            wordlistSource = "内蔵 + 外部ファイル";
            console.log(`外部ファイルから${externalWords.length}語を追加読み込み（合計${combinedWords.size}語）`);
        } else {
            throw new Error('wordlist.txtが空です');
        }
    } catch (error) {
        console.log('外部ファイル読み込み失敗:', error.message);
        console.log('内蔵デフォルト単語リスト（' + defaultWords.length + '語）のみを使用します');
        // 内蔵リストのみ使用
        commonWords = new Set(defaultWords);
        wordlistSource = "内蔵のみ";
    }
}

function caesarDecrypt(text, shift) {
    let result = "";
    for (let i = 0; i < text.length; i++) {
        const c = text.charCodeAt(i);
        if (c >= 65 && c <= 90) {
            result += String.fromCharCode((c - 65 - shift + 26) % 26 + 65);
        } else if (c >= 97 && c <= 122) {
            result += String.fromCharCode((c - 97 - shift + 26) % 26 + 97);
        } else {
            result += text[i];
        }
    }
    return result;
}

function highlightWords(text) {
    const words = text.split(/[\s,.\!\?\;\:\"\'\(\)\[\]\{\}]+/);
    let matchCount = 0;
    const matchedWords = new Set(); // 重複カウント防止

    // マッチした単語のリストを作成
    words.forEach(word => {
        if (word.length > 0) {
            const upperWord = word.toUpperCase();
            if (commonWords.has(upperWord) && !matchedWords.has(upperWord)) {
                matchedWords.add(upperWord);
                matchCount++;
            }
        }
    });

    // テキストを安全にハイライト（XSS対策）
    let highlightedText = '';
    const parts = text.split(/(\s+|[,.\!\?\;\:\"\'\(\)\[\]\{\}]+)/);

    parts.forEach(part => {
        if (part.length > 0 && /\S/.test(part)) {
            const upperPart = part.toUpperCase();
            if (matchedWords.has(upperPart)) {
                highlightedText += '<span class="match-word">' + escapeHtml(part) + '</span>';
            } else {
                highlightedText += escapeHtml(part);
            }
        } else {
            highlightedText += escapeHtml(part);
        }
    });

    return { text: highlightedText, count: matchCount };
}

function decrypt() {
    const text = document.getElementById("cipherText").value;
    if (!text.trim()) {
        alert("暗号文を入力してください");
        return;
    }

    if (!isWordlistLoaded) {
        alert("単語リストの読み込み中です。少々お待ちください。");
        return;
    }

    const results = document.getElementById("results");
    results.innerHTML = "";

    const decryptResults = [];

    for (let shift = 1; shift <= 25; shift++) {
        const decrypted = caesarDecrypt(text, shift);
        const highlighted = highlightWords(decrypted);
        
        decryptResults.push({
            shift: shift,
            text: decrypted,
            highlightedText: highlighted.text,
            matchCount: highlighted.count
        });
    }

    const sortedResults = [...decryptResults].sort((a, b) => b.matchCount - a.matchCount);
    
    const topCandidates = [];
    for (let i = 0; i < Math.min(3, sortedResults.length); i++) {
        if (sortedResults[i].matchCount > 0) {
            topCandidates.push({
                shift: sortedResults[i].shift,
                rank: i + 1,
                matchCount: sortedResults[i].matchCount
            });
        }
    }

    const statsDiv = document.createElement("div");
    statsDiv.className = "stats";
    
    let topCandidateInfo = "なし";
    if (topCandidates.length > 0) {
        topCandidateInfo = '鍵 = ' + topCandidates[0].shift + ' (' + topCandidates[0].matchCount + '語マッチ)';
    }
    
    const hasSpaces = /\s/.test(text);
    const warningText = hasSpaces ? "" : "<p><strong>⚠️ 注意:</strong> 空白なし暗号文のため、候補判定の信頼性が低下します。目視による平文判定を推奨します。</p>";
    
    statsDiv.innerHTML = 
        '<h4>📊 解読統計</h4>' +
        '<p><strong>入力文字数:</strong> ' + text.length + '文字</p>' +
        '<p><strong>単語リスト:</strong> ' + wordlistSource + '（' + commonWords.size + '語）</p>' +
        '<p><strong>最有力候補:</strong> ' + topCandidateInfo + '</p>' +
        '<p><strong>判定基準:</strong> 単語リストとの一致数</p>' +
        warningText;
    results.appendChild(statsDiv);

    for (let shift = 1; shift <= 25; shift++) {
        const result = decryptResults[shift - 1];
        const div = document.createElement("div");
        div.className = "result-block";

        let rankInfo = "";
        let rankClass = "";
        const candidate = topCandidates.find(c => c.shift === shift);
        
        if (candidate) {
            const rankNum = candidate.rank;
            rankInfo = '<span class="ranking-badge rank-' + rankNum + '">候補 ' + rankNum + '</span>';
            
            if (rankNum === 1) rankClass = "top-candidate";
            else if (rankNum === 2) rankClass = "second-candidate";
            else if (rankNum === 3) rankClass = "third-candidate";
            
            div.className += " " + rankClass;
        }

        div.innerHTML = 
            '<div class="key-info">鍵 = ' + shift + ' ' + rankInfo + '</div>' +
            '<div>' + result.highlightedText + '</div>' +
            '<div class="word-count">マッチした単語数: ' + result.matchCount + '</div>';
        
        results.appendChild(div);
    }
}

function clearResults() {
    document.getElementById("results").innerHTML = "";
}

// テーマ管理機能
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.querySelector('.theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}
