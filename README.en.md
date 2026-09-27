# Caesar Cipher Breaker

English · [日本語](README.md)

![GitHub Repo stars](https://img.shields.io/github/stars/ipusiron/caesar-cipher-breaker?style=social)
![GitHub forks](https://img.shields.io/github/forks/ipusiron/caesar-cipher-breaker?style=social)
![GitHub last commit](https://img.shields.io/github/last-commit/ipusiron/caesar-cipher-breaker)
![GitHub license](https://img.shields.io/github/license/ipusiron/caesar-cipher-breaker)
[![GitHub Pages](https://img.shields.io/badge/demo-GitHub%20Pages-blue?logo=github)](https://ipusiron.github.io/caesar-cipher-breaker/)

**Day008 - 100 Security Tools with Generative AI**

A Caesar cipher has only 25 possible keys, so you do not need to be clever: you can try them all. This tool decrypts a ciphertext with every shift from 1 to 25, shows all 25 plaintexts at once, and marks the three that look most like English.

Which candidate wins is decided in one of two ways. If the text has spaces and at least one candidate matches a word in the list, the ranking uses the number of distinct words matched. Otherwise it falls back to the chi-square distance between the letter frequencies of the candidate and those of English.

---

## 🌐 Demo

👉 [https://ipusiron.github.io/caesar-cipher-breaker/](https://ipusiron.github.io/caesar-cipher-breaker/)

---

## 📸 Screenshots

<p align="center">
  <img src="assets/screenshot.png" alt="Results for a ciphertext that keeps its spaces">
</p>

> *With the merged word list, the default ciphertext gives key 3 as candidate 1, on 16 distinct words matched.*

<p align="center">
  <img src="assets/screenshot2.png" alt="Results for a ciphertext with no spaces, ranked by letter frequency">
</p>

> *For the same 86 letters with the spaces removed, the frequency-based ranking still puts key 3 first.*

<p align="center">
  <img src="assets/screenshot3.png" alt="The same results in the dark theme">
</p>

> *The same results in the dark theme.*

---

## ✨ What it does

### Japanese and English

- The language button in the top right switches every label between Japanese and English.
- The choice is kept in `localStorage`, so the next visit starts in the same language.
- You can also ask for a language directly with `?lang=en` or `?lang=ja`.
- Switching language keeps your ciphertext and redraws the 25 candidates; nothing is lost.
- The ranking rules and thresholds are the same in both languages. Only the wording changes.

### Ciphertext with spaces (the easy case)

- The word boundaries survive encryption, so the word list can be used.
  - For example, `KHOOR MDSDQ` becomes `HELLO JAPAN`.
- This is where the automatic ranking works best.

### Ciphertext without spaces (ranked by frequency)

- A single run of letters, with nothing to split on.
  - For example, `KHOORMDSDQ` becomes `HELLOJAPAN` at shift 3.
- All 25 candidates are still shown.
- Instead of word matches, the ranking uses the chi-square of English letter frequencies.
- Below 30 letters the tool says so, because the score is not trustworthy there.

**On long texts without spaces**

Statistical attacks are the right tool for a long run of letters, and the chi-square score here is one of them. If you want to look at the letter frequencies themselves, Day009's [Frequency Analyzer](https://ipusiron.github.io/frequency-analyzer/) is already published ([source](https://github.com/ipusiron/frequency-analyzer)).

---

## 📖 How to use it

1. Open `index.html` in a browser.
2. Type or paste the ciphertext into the text area.
3. Press the brute-force button.
4. All 25 plaintexts appear, with the top three candidates marked.

Opened over `file://`, the page does not fetch the external word list and uses only the 165 built-in words. To get everything, run `python -m http.server` in the folder and open `http://localhost:8000/`.

Served over HTTP, the tool fetches `wordlist.txt` and uses those words together with the built-in 165, for 1,473 in total. If the file is missing or cannot be read, it falls back to the built-in list alone.

### The word list file

- The file name is fixed: `wordlist.txt`.
- One word per line.
- The bundled file is uppercase, but mixed case is handled correctly.
- The counts are as follows.

| Item | Count |
|---|---:|
| Built-in unique words | 165 |
| Lines in wordlist.txt | 1,842 |
| Unique words in wordlist.txt | 1,472 |
| Unique words after merging | 1,473 |

---

## 📐 What you see

### Characters

- Only English letters (A-Z, a-z) are shifted.
- Digits, punctuation and spaces are passed through unchanged.

### Word matching

- Words are split on spaces, commas, periods, exclamation and question marks, and similar punctuation.
- Matching against the word list ignores case.
- A matched word is shown in red, bold and underlined.
- A word that appears several times still counts once.

### Candidate ranking

- The top candidates are chosen by the rules above, but the list itself always stays in key order, 1 to 25.
- The best three are coloured.
  - **Candidate 1**: green (most likely)
  - **Candidate 2**: blue
  - **Candidate 3**: yellow

### Export for Semantic Ranking

The export button hands the candidates to another tool.

- It copies all 26 shifts (0 to 25) to the clipboard.
- Blocks are separated by a blank line.
- The format is the input that [Semantic Candidate Ranker](https://github.com/ipusiron/semantic-candidate-ranker) accepts.

The screen shows 25 candidates (shifts 1 to 25), but the export includes shift 0 as well, because that is what the receiving tool expects.

The output looks like this.

```
shift=0
KHOOR MDSDQ

shift=1
JGNNQ LCRCP

shift=2
IFMMP KBQBO
...
```

Each block is a `shift=N` line followed by the decrypted text.

### Statistics

Above the candidates the tool reports the following.

- The length of the input
- The word list in use, with its source and size
- The best candidate, with its key and match count
- Which criterion the ranking used
- Warnings, when they apply

Each candidate block shows its key, the number of words matched, and the chi-square score to two decimal places.

---

## 🎯 Where it is useful

- Learning how a Caesar cipher falls, and checking candidates during a CTF
- Comparing what a word list says with what letter frequencies say
- Preparing candidates to pass on to Semantic Candidate Ranker

---

## 🔬 How it works

`caesar-logic.js` does the decryption, the word matching, the chi-square score and the ranking. `main.js` handles the screen. `i18n.js` holds the Japanese and English wording, so neither of the other two carries any user-visible text.

If the input contains whitespace and at least one candidate matches a word, candidates are ordered by match count, descending. Ties are broken by chi-square ascending, then by key ascending. Without whitespace, or when no candidate matches anything, the order is chi-square ascending and then key ascending. Either way the best three are numbered.

Let *n* be the number of letters, *O_c* the count of letter *c*, and *f_c* its frequency in English as a percentage. The expected count and the score are then:

```text
E_c = n × f_c / 100
χ² = Σ(c=A..Z) (O_c − E_c)² / E_c
```

The frequency table matches the values in [chapter 1, figure 1.6 of *Wireless Communications Systems: An Introduction*, as published by Wiley](https://catalogimages.wiley.com/images/db/pdf/9781119419174.excerpt.pdf). The 26 values sum to 99.999% and are used as they are; only uppercased A-Z are counted. With no letters at all the score cannot be computed, and the tool says so instead of showing a number.

Across the 86 letters of the default text, key 3 scores 14.63 against 247.84 for the runner-up, key 15. Short texts give no such comfort. For the ten letters of `KHOORMDSDQ`, key 25 wins with 23.64 and the correct key 3 does not come first. Taking the first 15 to 86 letters of the default text, key 3 stayed first throughout, but that is an observation, not a guarantee. This is why fewer than 30 letters is flagged as unreliable.

| Ciphertext | Key | Plaintext |
|---|---:|---|
| `KHOOR MDSDQ` | 3 | `HELLO JAPAN` |
| `KHOORMDSDQ` | 3 | `HELLOJAPAN` |

---

## 🔒 Privacy

The ciphertext and the results stay in the browser and are never sent anywhere. Over HTTP the only extra request is for `wordlist.txt` from the same origin. `localStorage` holds two things and nothing else: the theme (`light` or `dark`) and the language (`ja` or `en`). The ciphertext is not stored. Everything on screen is built from DOM nodes and `textContent`.

A CSP is set in a meta tag, restricting scripts and styles to the same origin. There are no inline styles, `object-src` is `none`, and `base-uri` and `form-action` are limited to `self`. GitHub Pages cannot set response headers, so `frame-ancestors` — which only works as a header — is not available and is not written into the meta tag, where it would be ignored.

---

## ⚠️ Caveats

- A high rank does not mean the plaintext is correct. Short texts need your own eyes.
- English letter frequencies do not transfer to text in other languages.
- Shift 0 is not among the on-screen candidates, but it is included in the export.

---

## 🧪 Tests

Node 22 or newer, with no packages to install.

```sh
npm test
```

`node --test` covers the known answers, the round trip through every shift, the ranking rules, the short-text case where key 25 wins, the HTML, the colour contrast and the formatting. The numbers, worked examples and image references in the README are checked against the real files. The Japanese and English dictionaries are checked too: the same keys on both sides, the same placeholder names, no untranslated Japanese left in the English one, and no state that is decided by comparing against displayed text. GitHub Actions runs all of it on push and on pull requests.

---

## ❓ FAQ

### Why does `file://` leave me with 165 words?

Browsers block `fetch` against local files, so the page does not try, and uses the built-in list. Served over HTTP you get the merged 1,473.

### Why is the right answer not first for a short text without spaces?

Because a handful of letters says little about the language. Read through all 25 candidates, and consider judging them by meaning as well.

---

## 🔗 Related

- [Caesar Cipher Wheel Tool](https://ipusiron.github.io/caesar-cipher-wheel/)
- [Frequency Analyzer (Day009)](https://github.com/ipusiron/frequency-analyzer)
- [Semantic Candidate Ranker](https://github.com/ipusiron/semantic-candidate-ranker)

---

## 📁 Layout

```
caesar-cipher-breaker/
├── index.html          # The page
├── i18n.js             # Japanese and English wording, language switching
├── caesar-logic.js     # Decryption, word matching, chi-square, ranking
├── main.js             # Rendering, word list fetch, theme, clipboard
├── style.css           # Stylesheet
├── wordlist.txt        # 1,842 lines, 1,472 unique words (unchanged)
├── package.json        # npm test, no dependencies
├── test/               # Logic, score, README, HTML, contrast, formatting, i18n
├── assets/             # screenshot.png to screenshot3.png
├── .github/workflows/  # Test workflow
├── .claude/            # Local development files (not tracked)
├── ss1.png             # Older screenshot (initial view)
├── ss2.png             # Older screenshot (results)
├── README.md           # Japanese documentation
├── README.en.md        # This file
├── LICENSE             # MIT
├── CLAUDE.md           # Notes for Claude Code
├── .gitignore
└── .nojekyll           # For GitHub Pages
```

---

## 💻 Requirements

Recent versions of Chrome, Edge, Firefox and Safari. Opening the file directly works, but leaves you with the built-in 165 words. Tests need Node 22 or newer; there is nothing to build and nothing to install.

---

## 📄 License

- See the `LICENSE` file for the license of the source code.

---

## 🛠️ About this project

This tool was built as part of **100 Security Tools with Generative AI**, a project that produces and publishes one security-related tool a day for 100 days, with the help of generative AI.

For the project itself and the other tools, see:

🔗 https://akademeia.info/?page_id=42163
