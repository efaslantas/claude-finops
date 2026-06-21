<div align="center">

# Claude FinOps Terminal

**A reference implementation of Claude's finance capabilities —
live portfolio terminal, AI risk analysis, macro stress tests, PDF report parsing,
tax harvesting, news sentiment, benchmarking and rebalance suggestions.**

[English](#-english) · [Türkçe](#-türkçe)

![status](https://img.shields.io/badge/status-active-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)
![runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)
![python](https://img.shields.io/badge/python-3.8%2B-blue)
![built with](https://img.shields.io/badge/built%20with-Claude-8A63D2)
![skills](https://img.shields.io/badge/skills-14-purple)

</div>

---

## 🇬🇧 English

### Why Claude for finance?

Most financial tools use Claude as a chatbot layer on top of a data pipeline.
This project flips that: **Claude is the pipeline.** Every analysis runs through
Claude's native capabilities — long context, vision, extended thinking, tool use,
parallel agents — not a fixed rule engine.

| Claude capability | How it's used here |
|---|---|
| **200k token context** | Read an entire 200-page annual report in one pass — not a summary, the whole thing |
| **Vision / PDF** | Parse 10-K filings, scanned bank statements, chart screenshots natively — no OCR pre-step |
| **Extended thinking** | Step-by-step DCF reasoning, macro sensitivity chains, tax optimization logic |
| **Parallel subagents** | News sentiment + index benchmarking run simultaneously in the Intel phase |
| **Tool use / MCP** | Yahoo Finance connector wired natively — no middleware, no API key |
| **Structured output** | Risk findings, portfolio data, stress test results returned as strict JSON schemas |
| **Agent composition** | Skill + connector + subagent — Anthropic's reference finance-agent pattern |
| **Multilingual** | Turkish and English financial analysis with full context, not translation |
| **Web search / fetch** | Live news, regulatory filings, earnings releases pulled at analysis time |

### What's implemented vs what's on the roadmap

| Capability | Skill / feature | Status |
|---|---|---|
| Live portfolio valuation | `finops-agent` | ✅ |
| AI risk analysis | `reviewer` subagent | ✅ |
| Scenario projections (bear/base/bull) | `model-builder` | ✅ |
| Earnings vs consensus | `earnings-reviewer` | ✅ |
| Valuation (P/E, EV/EBITDA, peers) | `valuation-reviewer` | ✅ |
| Market research (live) | `market-researcher` | ✅ |
| Investment pitch | `pitch-builder` | ✅ |
| Pre-meeting brief | `meeting-preparer` | ✅ |
| Financial statement audit | `statement-auditor` | ✅ |
| Bank statement reconciliation | `gl-reconciler` | ✅ |
| Month-end close | `month-end-closer` | ✅ |
| KYC screening | `kyc-screener` | ✅ |
| News sentiment (per ticker) | `news-sentiment` subagent + F3 panel | ✅ |
| Index benchmarking (alpha) | `benchmark-tracker` subagent + F4 panel | ✅ |
| Rebalance advisor | `rebalancer` subagent + F11 panel | ✅ |
| **PDF / annual report parser** | **`pdf-analyzer`** | ✅ new |
| **Macro stress test** | **`macro-stress`** | ✅ new |
| **Tax-loss harvesting** | **`tax-harvester`** | ✅ new |
| Monte Carlo simulation | `model-builder` (future: code tool) | 🔜 roadmap |
| Options pricing (Black-Scholes) | `options-pricer` | 🔜 roadmap |
| M&A due diligence | `ma-screener` | 🔜 roadmap |
| Chart vision (screenshot → pattern) | `chart-reader` | 🔜 roadmap |
| Extended thinking DCF | `model-builder` + thinking mode | 🔜 roadmap |
| Dividend reinvestment optimizer | `drip-optimizer` | 🔜 roadmap |

---

### ✨ Feature overview

| | |
|---|---|
| 🔌 **Plug-and-play** | Search assets by name (*"Apple"*, *"Bitcoin"*), ticker resolved automatically |
| 🧠 **Real AI analysis** | `reviewer` subagent flags concentration, FX and single-asset risks — not rule templates |
| 💹 **Any asset class** | Equities (NASDAQ/BIST/XETRA/…), cash (multi-currency), commodities, crypto |
| 📰 **News & sentiment** | Per-ticker headlines + positive/negative/neutral sentiment scoring |
| 📊 **Index benchmarking** | Portfolio return vs BIST100, S&P 500, Gold — alpha computed |
| ⚖️ **Rebalance advisor** | Current vs target allocation → buy/sell trade list with amounts |
| 📄 **PDF parser** | Annual reports, 10-K filings, bank statements — native Claude reading |
| 🌍 **Macro stress test** | Fed rate, inflation, FX devaluation → per-holding impact chain |
| 💸 **Tax harvesting** | Unrealized loss candidates + replacement assets + savings estimate |
| 🪙 **Token tracking** | Every Claude run counted — total tokens visible in the top bar |
| 🐳 **Zero runtime deps** | `./start.sh` or `docker compose up` — no framework, no build step |
| 🔒 **Privacy-first** | Holdings stay local (gitignored); only `*.sample` data is shared |

---

### 🚀 Quick start

```bash
git clone https://github.com/efaslantas/claude-finops.git
cd claude-finops
./start.sh            # → http://localhost:8765
```

Click **⚙ Edit Portfolio**, search assets by name, set quantities, **Save** — prices load live.

```bash
# Docker
docker compose up --build   # → http://localhost:8765
```

### 🖥️ The screen

One page, F-key navigation, no tabs:

| Key | Panel | What it shows |
|---|---|---|
| — | **Hero band** | Net-worth · daily P&L · trend sparkline · allocation bar · data quality · token badge |
| — | **Risk ribbon** | Top AI finding (click → F8) |
| — | **Positions** | Holdings: qty · live price · value · weight · class |
| — | **Pipeline** | Visual 6-phase AI workflow + quick refresh button |
| `F3` | **News** | Per-ticker headlines + recency badge |
| `F4` | **Index** | 30-day return: portfolio vs BIST100 vs S&P500 vs Gold + alpha |
| `F5` | **Scenario** | Bear / base / bull from live prices |
| `F6` | **Allocation** | Asset-class % + currency exposure + FX sensitivity table |
| `F7` | **Market watch** | Holdings (★) + watchlist, live |
| `F8` | **Risk findings** | `reviewer` output, severity-sorted |
| `F9` | **Reports** | `output/*.md` skill outputs, markdown-rendered |
| `F10` | **History** | Daily net-worth trend + AI token usage |
| `F11` | **Rebalance** | Allocation delta → buy/sell list · price alerts |
| `F12` | **Mini CLI** | `help`, `portfolio`, `skills`, … |
| modal | **⚙ Edit Portfolio** | Search by name → ticker auto-resolved → live pricing |

---

### 🧩 Agent composition

Reference implementation of Anthropic's **skill + connector + subagent** finance-agent pattern:

| Concept | Here | Location |
|---|---|---|
| **Skill** | 14 Agent Skills | `.claude/skills/<name>/SKILL.md` |
| **Connector** | Claude WebFetch · Yahoo Finance APIs | `connectors/live-quotes/` |
| **Subagent** | 5 specialised agents | `.claude/agents/<name>.md` |
| **Workflow** | `finops-full-pipeline` (6 phases) | `.claude/workflows/` |

#### Skills (14)

| Skill | Claude capability used | What it does |
|---|---|---|
| `finops-agent` | Tool use, structured output | Portfolio net-worth orchestrator |
| `market-researcher` | Web search, long context | Live stock/sector research |
| `valuation-reviewer` | Reasoning, web fetch | P/E, EV/EBITDA, peer comparison |
| `model-builder` | Reasoning, structured output | FX path, bear/base/bull projections |
| `earnings-reviewer` | Web fetch, reasoning | Earnings vs consensus summary |
| `pitch-builder` | Reasoning, web search | Bull/bear/balanced investment pitch |
| `meeting-preparer` | Web search, long context | Pre-meeting brief (earnings/board) |
| `statement-auditor` | Long context, reasoning | Balance sheet / P&L / cash-flow audit |
| `gl-reconciler` | Long context, structured output | Bank statement → reconciliation report |
| `month-end-closer` | Long context, reasoning | Monthly P&L + FX impact from history |
| `kyc-screener` | Web search, reasoning | 5-dimension KYC screening |
| **`pdf-analyzer`** | **Vision, 200k context** | **Annual reports, 10-K, PDF statements** |
| **`macro-stress`** | **Extended thinking, reasoning** | **Fed/inflation/FX shock → portfolio impact** |
| **`tax-harvester`** | **Reasoning, structured output** | **Tax-loss candidates + savings estimate** |

#### Subagents (5)

| Agent | Role |
|---|---|
| `data-retriever` | Live quotes from Yahoo Finance, normalized to base currency |
| `reviewer` | AI risk analysis: concentration, FX exposure, single-asset dominance |
| `news-sentiment` | Per-ticker news + sentiment score (−2 → +2) |
| `benchmark-tracker` | 30-day portfolio vs BIST100, S&P500, Gold — alpha |
| `rebalancer` | Current vs target allocation → buy/sell list with amounts |

---

### 🏗️ Architecture

Two independent data paths share `output/latest.json`:

```
                       ┌─ POST /api/refresh ─→ live_refresh() [Python, no LLM] ──┐
   Terminal UI ────────┤                                                           ├─→ output/latest.json → UI
                       └─ POST /api/run ─→ signal file ─→ Claude watcher ─→ workflow ┘
```

**6-phase workflow** (`finops-full-pipeline.js`):

```
1 Intake    → validate portfolio.json
2 Connector → data-retriever: live quotes + FX normalization
3 Review    → reviewer: AI risk findings
4 Intel     → news-sentiment + benchmark-tracker (parallel)
5 Rebalance → rebalancer: allocation delta + trade list
6 Synthesis → compute breakdown, write latest.json + status
```

The server never spawns Claude directly (RCE safety). An open Claude session watches for
the signal file and runs the workflow.

---

### 📁 Project structure

```
index.html               → terminal UI (single page, no build step)
assets/css/terminal.css  → dark terminal theme
assets/js/terminal.js    → all UI logic (vanilla JS, no framework)
pipeline_server.py       → static server + /api bridge (stdlib only)
.claude/
  skills/                → 14 skill SKILL.md files
  agents/                → 5 subagent .md files
  workflows/             → finops-full-pipeline.js
connectors/live-quotes/  → Yahoo Finance connector notes
data/
  portfolio.sample.json  → example portfolio (yours stays gitignored)
  targets.sample.json    → example rebalance target allocation
output/                  → generated artifacts (gitignored; *.sample shared)
Dockerfile · docker-compose.yml · start.sh · .github/workflows/ci.yml
```

### 🔌 API reference

| Method · Path | Description |
|---|---|
| `GET /api/latest` | Current `output/latest.json` |
| `GET /api/history` | Daily net-worth + token totals |
| `GET /api/search?q=` | Yahoo symbol search (name → ticker) |
| `GET /api/portfolio` | Load holdings |
| `GET /api/news?ticker=` | Recent headlines for a ticker |
| `GET /api/benchmark?days=` | Portfolio vs index returns |
| `GET /api/dividends` | Dividend yield/rate for equity holdings |
| `GET /api/rebalance` | Allocation delta + trade list |
| `GET /api/alerts` | Saved price alerts |
| `POST /api/portfolio` | Save holdings → live refresh |
| `POST /api/refresh` | Fetch live prices → recompute |
| `POST /api/run` | Write AI-analysis signal |
| `POST /api/alerts` | Save price alerts |
| `POST /api/rebalance` | Compute rebalance on demand |
| `POST /api/record-run?tokens=N` | Log pipeline run + tokens |

### 📋 `portfolio.json` schema

```json
{
  "base_currency": "TRY",
  "holdings": [
    { "id": "NVDA", "name": "NVIDIA", "type": "equity", "ticker": "NVDA", "ccy": "USD",
      "quantity": 4, "cost_basis_per_unit": 180.00, "cost_basis_ccy": "USD", "purchase_date": "2024-03-15" },
    { "id": "TRY_CASH", "name": "TL Cash", "type": "cash", "ccy": "TRY", "amount": 100000 },
    { "id": "GOLD", "name": "Gold (gram)", "type": "commodity", "ticker": "GC=F", "ccy": "USD", "quantity": 50 },
    { "id": "BTC", "name": "Bitcoin", "type": "crypto", "ticker": "BTC-USD", "ccy": "USD", "quantity": 0.05 }
  ]
}
```

`cost_basis_per_unit` + `purchase_date` are optional but required for `tax-harvester`.

---

### 🔜 Roadmap

Capabilities Claude has that aren't yet wired into skills:

| | Skill | What it would do |
|---|---|---|
| 📈 | `options-pricer` | Black-Scholes / binomial pricing, Greeks (Δ Γ Θ Vega) for options positions |
| 🎲 | `monte-carlo` | 1 000-path simulation for retirement/accumulation planning (code tool) |
| 🔬 | `ma-screener` | Full M&A due diligence checklist — financial, legal, operational, synergies |
| 📸 | `chart-reader` | Screenshot → candlestick pattern, trend, support/resistance (vision) |
| 🤔 | `dcf-thinking` | Extended thinking mode DCF — auditable step-by-step valuation reasoning |
| 💰 | `drip-optimizer` | Dividend reinvestment optimizer — compound schedule, tax efficiency |
| 🏦 | `credit-analyzer` | Bond yield, duration, credit risk, covenant analysis |
| 🌐 | `macro-calendar` | Upcoming macro events → portfolio impact pre-brief |

PRs welcome — each skill is a single `.claude/skills/<name>/SKILL.md` file.

---

### 🤝 Contributing

1. Never commit real financial data — `.gitignore` keeps `data/*.json` and `output/*` local.
2. New skill: create `.claude/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
3. New subagent: add `.claude/agents/<name>.md` following the existing contract pattern.
4. CI: `python -m py_compile pipeline_server.py` + JSON validation on every push.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### 📜 License

MIT — see [LICENSE](LICENSE).

**Not investment advice.** Prices may be delayed or indicative. Do your own research.

---

## 🇹🇷 Türkçe

**Claude agent'larıyla** çalışan, tek sayfalık Bloomberg-tarzı **portföy terminali**.
Varlıklarını ekle, canlı net-değer + AI risk analizi + haber sentiment + endeks karşılaştırması +
PDF rapor okuma + makro stres testi + vergi hasadı al. Sıfır çalışma-zamanı bağımlılığı.

> ⚠️ Eğitim amaçlı sandbox — **yatırım tavsiyesi değildir**.

### Neden Claude?

Çoğu finansal araç Claude'u bir chatbot katmanı olarak kullanır. Bu proje tersini yapar:
**Claude pipeline'ın kendisidir.** 200 000 token bağlam, vision/PDF okuma, extended thinking,
paralel subagent'lar — hepsi doğrudan kullanılır.

| Claude kapasitesi | Burada nasıl kullanılıyor |
|---|---|
| **200k bağlam** | 200 sayfalık yıllık raporu tek geçişte oku |
| **Vision / PDF** | 10-K, banka ekstresi, grafik ekran görüntüsü — OCR gerekmez |
| **Extended thinking** | DCF, makro duyarlılık zinciri, vergi optimizasyonu adım adım |
| **Paralel subagent** | Haber sentiment + endeks karşılaştırması aynı anda çalışır |
| **Tool use** | Yahoo Finance connector — middleware yok, API anahtarı yok |
| **Çok dilli** | Türkçe ve İngilizce finansal analiz, tam bağlamla |

### 14 Skill

`finops-agent` · `market-researcher` · `valuation-reviewer` · `model-builder` · `earnings-reviewer` ·
`pitch-builder` · `meeting-preparer` · `statement-auditor` · `gl-reconciler` · `month-end-closer` ·
`kyc-screener` · **`pdf-analyzer`** · **`macro-stress`** · **`tax-harvester`**

### Hızlı başlangıç

```bash
git clone https://github.com/efaslantas/claude-finops.git
cd claude-finops
./start.sh   # → http://localhost:8765
```

### Lisans

MIT. **Yatırım tavsiyesi değildir.**

---

<div align="center">
<sub>Built with <a href="https://claude.com/claude-code">Claude Code</a></sub>
</div>
