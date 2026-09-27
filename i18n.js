// 日本語と英語のメッセージ。UI側のスクリプトは言語ごとの文字列を持たない。
const I18n = (() => {
    const ja = {
        'app.title': 'シーザー暗号解読ツール（Caesar Cipher Breaker）',
        'app.heading': '🔓 シーザー暗号解読ツール（Caesar Cipher Breaker）',
        'app.description': 'シーザー暗号を総当たりで解読し、単語の一致数または英語文字頻度のカイ二乗で候補を判定するツール。',
        'app.langButton': 'English',
        'app.langAria': '言語を切り替える',
        'theme.toDark': 'ダークモードに切り替える',
        'theme.toLight': 'ライトモードに切り替える',
        'info.label': '暗号文作成：',
        'info.suffix': 'で暗号文を作成できます',
        'input.label': '暗号文入力',
        'input.placeholder': 'ここに暗号文を入力...（空白なしにも対応）',
        'button.decrypt': '総当たり解読（全パターン表示）',
        'button.clear': '結果クリア',
        'button.copySemantic': 'Semantic Ranking形式でコピー',
        'stats.heading': '📊 解読統計',
        'stats.length': '入力文字数',
        'stats.lengthValue': '{count}文字',
        'stats.wordlist': '単語リスト',
        'stats.wordlistValue': '{source}（{count}語）',
        'stats.top': '最有力候補',
        'stats.topValue': '鍵 = {shift}（{count}語マッチ）',
        'stats.criterion': '判定基準',
        'stats.criterionWords': '単語リストとの一致数',
        'stats.criterionChi': '英語文字頻度（カイ二乗）',
        'warn.noSpace': '空白なしのため単語マッチが使えず、英語文字頻度で判定しています。',
        'warn.shortText': '英字が30字未満のため、頻度による判定の信頼性は低いです。',
        'warn.noLetters': '英字がないためカイ二乗は算出できません。',
        'result.key': '鍵 = {shift}',
        'result.badge': '候補 {rank}',
        'result.score': 'マッチした単語数: {matches}／カイ二乗: {chi}',
        'result.chiUnavailable': '算出不可（英字なし）',
        'wordlist.builtin': '内蔵のみ',
        'wordlist.fileProtocol': '内蔵のみ／file://のため外部辞書は読み込みません',
        'wordlist.combined': '内蔵 + 外部ファイル',
        'toast.needText': '暗号文を入力してください',
        'toast.loading': '単語リストの読み込み中です。少々お待ちください。',
        'toast.needDecrypt': '先に解読を実行してください',
        'toast.copied': 'コピーしました（Semantic Ranking形式）',
        'toast.copyFailed': 'コピーに失敗しました',
        'console.wordlist': '単語リスト（{count}語）：{source}',
        'footer.repo': '🔗 GitHubリポジトリはこちら（',
        'footer.repoEnd': '）',
        'noscript': 'このツールの利用にはJavaScriptが必要です。'
    };

    const en = {
        'app.title': 'Caesar Cipher Breaker',
        'app.heading': '🔓 Caesar Cipher Breaker',
        'app.description': 'Brute-force a Caesar cipher and rank the candidates by word-list matches or by the chi-square of English letter frequencies.',
        'app.langButton': '日本語',
        'app.langAria': 'Switch language',
        'theme.toDark': 'Switch to dark mode',
        'theme.toLight': 'Switch to light mode',
        'info.label': 'Need a ciphertext?',
        'info.suffix': 'can create one for you',
        'input.label': 'Ciphertext',
        'input.placeholder': 'Paste the ciphertext here... (text without spaces also works)',
        'button.decrypt': 'Brute-force (show all 25 shifts)',
        'button.clear': 'Clear results',
        'button.copySemantic': 'Copy for Semantic Ranking',
        'stats.heading': '📊 Cracking stats',
        'stats.length': 'Input length',
        'stats.lengthValue': '{count} characters',
        'stats.wordlist': 'Word list',
        'stats.wordlistValue': '{source} ({count} words)',
        'stats.top': 'Best candidate',
        'stats.topValue': 'Key = {shift} ({count} words matched)',
        'stats.criterion': 'Ranking criterion',
        'stats.criterionWords': 'Number of word-list matches',
        'stats.criterionChi': 'English letter frequency (chi-square)',
        'warn.noSpace': 'The text has no spaces, so word matching is unavailable and the ranking uses English letter frequency.',
        'warn.shortText': 'Fewer than 30 letters, so the frequency-based ranking is not reliable.',
        'warn.noLetters': 'There are no letters, so the chi-square score cannot be computed.',
        'result.key': 'Key = {shift}',
        'result.badge': 'Rank {rank}',
        'result.score': 'Words matched: {matches} / Chi-square: {chi}',
        'result.chiUnavailable': 'not available (no letters)',
        'wordlist.builtin': 'Built-in only',
        'wordlist.fileProtocol': 'Built-in only; file:// cannot fetch the external list',
        'wordlist.combined': 'Built-in + external file',
        'toast.needText': 'Enter a ciphertext first',
        'toast.loading': 'The word list is still loading. Please wait a moment.',
        'toast.needDecrypt': 'Run the brute force first',
        'toast.copied': 'Copied (Semantic Ranking format)',
        'toast.copyFailed': 'Copy failed',
        'console.wordlist': 'Word list ({count} words): {source}',
        'footer.repo': '🔗 GitHub repository: ',
        'footer.repoEnd': '',
        'noscript': 'This tool requires JavaScript.'
    };

    let language = 'ja';
    const STORAGE_KEY = 'caesar-cipher-breaker-language';

    function t(key, values = {}) {
        const dict = language === 'en' ? en : ja;
        const message = dict[key];
        if (typeof message !== 'string') throw new Error('Unknown message: ' + key);
        return message.replace(/\{(\w+)\}/g, (whole, name) =>
            (Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : whole));
    }

    function apply(root = document) {
        document.documentElement.lang = language;
        document.title = t('app.title');
        const meta = document.querySelector('meta[name="description"]');
        if (meta) meta.setAttribute('content', t('app.description'));
        root.querySelectorAll('[data-i18n]').forEach(element => { element.textContent = t(element.dataset.i18n); });
        for (const attr of ['aria-label', 'title', 'placeholder']) {
            root.querySelectorAll(`[data-i18n-${attr}]`).forEach(element =>
                element.setAttribute(attr, t(element.getAttribute(`data-i18n-${attr}`))));
        }
    }

    function setLanguage(value) {
        if (!['ja', 'en'].includes(value)) return;
        language = value;
        try { localStorage.setItem(STORAGE_KEY, value); } catch (error) { /* 保存できない環境では現在のページにだけ反映する。 */ }
        apply();
        document.dispatchEvent(new Event('languagechange'));
    }

    function init() {
        let saved = null;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch (error) { /* 保存領域が無効でも既定の言語で動く。 */ }
        const query = new URLSearchParams(location.search).get('lang');
        language = [query, saved].find(value => value === 'ja' || value === 'en')
            || (/^ja\b/i.test(navigator.language || '') ? 'ja' : 'en');
        apply();
    }

    return { ja, en, t, apply, init, setLanguage, get language() { return language; } };
})();

if (typeof window !== 'undefined') window.I18n = I18n;
if (typeof module !== 'undefined' && module.exports) module.exports = I18n;
