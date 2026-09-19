# CLAUDE.md

このファイルは本リポジトリの開発方針をまとめています。

## Project Overview

Day008「生成AIで作るセキュリティツール100」のシーザー暗号解読ツールです。
vanilla JavaScriptの静的Webツールで、npm依存とビルド処理はありません。
空白ありでは単語マッチ数、空白なしや全候補マッチ0ではカイ二乗を使って候補を判定します。

## Common Development Commands

Node22以上でテストを実行します。HTTP配信にはPythonも使用できます。

```bash
npm test
python -m http.server
```

index.htmlをfile://で直接開くこともできます。この場合はfetchを呼ばず内蔵165語のみを使います。
HTTP配信ではwordlist.txtを取得し、合併した1,473語を使います。
公開は作業ブランチとPRから行い、mainへ直接pushしません。

## Architecture and Key Components

### Core Files

- index.html：入力、操作ボタン、結果、通知、GitHubフッター
- caesar-logic.js：DOM非依存の古典スクリプトとCommonJS共用モジュール
- main.js：DOM構築、辞書取得、テーマ管理、クリップボード操作
- style.css：ライト／ダークのCSS変数、モバイル表示
- wordlist.txt：1,842行、ユニーク1,472語。内蔵165語との合併は1,473語
- test/：node:testとnode:assert/strictによる6ファイル
- package.json：依存なしのnpm test（node --test）
- .github/workflows/test.yml：push／pull_requestのNode22テスト
- assets/：README用のスクリーンショット3枚
- LICENSE：MITライセンス

### Key Implementation Details

### Core Functions

caesar-logic.jsはglobalThis.CaesarLogicとmodule.exportsに次を公開します。

- DEFAULT_WORDS：重複なしの165語
- ENGLISH_FREQ：英語文字頻度26値（合計99.999%）
- caesarDecrypt／caesarEncrypt：英字のみをシフトし、他の文字は保持
- chiSquared：英語頻度とのカイ二乗。英字0文字ではnull
- isChiReliable：英字30字以上でtrue
- splitForHighlight：textとisMatchを持つセグメント配列
- countWordMatches：重複を除いたマッチ語数
- rankShifts：25候補、上位3件のrank、words／chiのcriterion
- parseWordlist：空行除去、前後空白除去、大文字化（重複行は保持）
- buildSemanticExport：シフト0〜25の26ブロック、LFの空行区切り

main.jsのloadWordlistは読み込み中にボタンを無効化し、完了後に戻します。
decryptとhighlightWordsはDOMを構築し、clearResultsで結果とコピーボタンを隠します。
copyForSemanticRanking、showToast、initTheme、toggleTheme、updateThemeIconが画面操作を担当します。

単語判定は大小文字を区別せず、同じ単語は1回だけ数えます。
空白ありでマッチがあれば単語数降順、カイ二乗昇順、シフト昇順で比較します。
それ以外はカイ二乗昇順、シフト昇順です。画面の表示順は鍵1〜25を維持します。

## Important Notes

- npm testで既知解答、往復、採点、README、HTML、配色、整形を検証する。
- `KHOOR MDSDQ`は鍵3で`HELLO JAPAN`、`KHOORMDSDQ`は鍵3で`HELLOJAPAN`に戻る。
- ただし空白なし短文のカイ二乗1位は鍵25である。この限界の期待値を変更しない。
- 頻度表や期待値を変更する場合はテストを実行し、仕様と計算結果を確認する。
- 暗号文を外部送信しない。ライブラリー、npm依存、CDNを追加しない。
- DOM表示にinnerHTMLを使わず、textContentで文字列として扱う。
- CSPにframe-ancestorsを書かない。metaでは無効である。
- localStorageはlight／darkのテーマだけに使用し、不正値や保存拒否にも対応する。
- HTTPとfile://の両方でconsoleとCSP違反を確認する。
- 旧画像ss1.png・ss2.png、wordlist.txt、初期暗号文、26ブロックの出力形式は維持する。

公開先はhttps://ipusiron.github.io/caesar-cipher-breaker/です。
