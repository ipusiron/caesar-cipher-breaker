# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Caesar Cipher Breaker web application - a brute-force decryption tool that analyzes encrypted text and finds the most likely plaintext by matching against common English words. It's part of a "100 Security Tools with Generative AI" project (Day 7/100).

## Common Development Commands

Since this is a vanilla JavaScript project with no build system:

```bash
# Run locally - open in browser
open index.html  # macOS
xdg-open index.html  # Linux
start index.html  # Windows

# Deploy to GitHub Pages
git add .
git commit -m "your message"
git push origin main
# Then configure GitHub Pages in repository settings
```

## Architecture and Key Components

### Core Files
- **index.html**: UI structure with input textarea, decrypt button, and results display area
- **main.js**: Contains the decryption logic:
  - `caesarShift()`: Performs Caesar cipher shift for a single character
  - `decryptCaesar()`: Applies shift to entire text
  - `countEnglishWords()`: Matches decrypted text against word list
  - `decryptAllShifts()`: Tries all 25 shifts and ranks by word matches
- **style.css**: Modern, responsive styling with color-coded results
- **wordlist.txt**: ~1,000 common English words (fallback: 165 built-in words)

### Key Implementation Details

1. **Word Matching Logic** (main.js:18-29):
   - Uses regex with word boundaries for accurate matching
   - Case-insensitive comparison
   - Highlights matched words in red

2. **Ranking System**:
   - Tries all 25 possible shifts
   - Counts matched English words for each shift
   - Displays top 3 candidates sorted by match count

3. **External Wordlist Loading** (main.js:120-132):
   - Fetches wordlist.txt asynchronously
   - Falls back to built-in word array if fetch fails
   - Updates UI to show word source

## Important Notes

- **No Testing Framework**: Test manually with provided examples:
  - `KHOOR MDSDQ` → `HELLO JAPAN`
  - `KHOORMSDSDQ` → `HELLOJAPAN`
- **Browser Compatibility**: Uses modern JavaScript features (fetch, async/await)
- **Deployment**: Static files ready for GitHub Pages (demo: https://ipusiron.github.io/caesar-cipher-breaker/)
- **Language Support**: English only (A-Z, a-z), preserves non-alphabetic characters
- **Known Limitation**: Less effective on continuous text without spaces