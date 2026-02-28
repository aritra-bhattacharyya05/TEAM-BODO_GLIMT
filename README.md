# Veridex — AI Authentication

> **Team Bodo-Glimt · Hackathon 2026**  
> Detect AI-generated images and text in under 3 seconds using Groq LLaMA 3.3 70B.

---

## Project Structure

```
veridex/
│
├── index.html              ← Entry point (open this in browser)
│
├── css/
│   ├── tokens.css          ← Design tokens, reset, keyframes
│   ├── layout.css          ← Nav, sections, footer
│   ├── home.css            ← Hero, feature grid, how-it-works steps
│   ├── authenticator.css   ← Analyzer page: panels, inputs, tabs, API banner
│   ├── results.css         ← Score cards, ring gauges, highlights, table
│   └── responsive.css      ← All breakpoints (960px, 700px, 400px)
│
├── js/
│   ├── main.js             ← Entry point: bootstraps all modules
│   ├── groq.js             ← Groq API client + key management
│   ├── ui.js               ← Shared UI helpers (page nav, rings, badges)
│   ├── imageAnalyzer.js    ← Image input + analysis logic
│   └── textAnalyzer.js     ← Text scoring, Groq integration, highlights
│
└── pages/
    ├── home.html           ← Home page HTML partial (reference)
    └── authenticator.html  ← Authenticator page HTML partial (reference)
```

> **Note:** `pages/*.html` are reference partials. The actual app is self-contained in `index.html`.  
> In a production setup (Vite, webpack, or server-side), you'd use these partials with includes.

---

## Getting Started

### Option A — Open directly in browser
```bash
open veridex/index.html
```
Works out of the box. ES Modules (`type="module"`) are fully supported in all modern browsers when opened via `file://` on Chrome/Edge, or served via HTTP.

> If you see CORS errors opening via `file://`, use Option B.

### Option B — Serve locally (with API proxy)
```bash
# Install dependencies once
cd veridex
npm install express

# Start the server which serves static files and proxies Groq
node server.js
```
Then open `http://localhost:3000` in your browser.  The server uses the key
in `process.env.GROQ_API_KEY` or the built-in demo key if unset.


---

## Groq API Key

The application no longer requires you to supply a key. A single Groq API key is securely stored on our backend and all requests are proxied through `/api/groq`. Keys are never exposed to or stored in the browser. If the proxy fails (e.g. network error), the analyzers fall back to demo results.

---

## Architecture

| File | Responsibility |
|------|---------------|
| `groq.js` | API client, key management, system prompts |
| `ui.js` | Page navigation, ring animations, verdict badges |
| `imageAnalyzer.js` | File/URL/paste input, image analysis orchestration |
| `textAnalyzer.js` | Local pattern scoring, Groq call, sentence highlights |
| `main.js` | DOMContentLoaded bootstrap, exposes functions to `window` |

### CSS Layer Order
`tokens` → `layout` → `home` → `authenticator` → `results` → `responsive`

Each layer only styles what it owns; responsive overrides go last.

---

## Tech Stack

- **Frontend:** Vanilla HTML/CSS/JS (ES Modules, no build step)
- **AI Engine:** Groq API · LLaMA 3.3 70B Versatile
- **Fonts:** Syne (display) · Outfit (body) · DM Mono (code)
- **Deployment:** Any static host — Vercel, Netlify, GitHub Pages

---

## Detection Methodology

### Text
Local pattern scoring (25 AI signals, 23 human signals) + optional Groq sentence-level classification. Signals include hedging language, stylometric patterns, vocabulary diversity heuristics.

### Image
Groq vision reasoning + heuristic attribute scoring across: Pixel Entropy, Compression Artifacts, EXIF Integrity, AI-Gen Signature, Edge Coherence.

---

© 2026 Veridex · Team Bodo-Glimt
