<div align="center">

# Claude FinOps Terminal

**A Claude-native portfolio terminal — live net-worth, AI risk analysis, scenario projections,
news sentiment, index benchmarking and rebalance suggestions. All in one Bloomberg-style screen.**

[English](#-english) · [Türkçe](#-türkçe)

![status](https://img.shields.io/badge/status-active-brightgreen)
![license](https://img.shields.io/badge/license-MIT-blue)
![runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)
![python](https://img.shields.io/badge/python-3.8%2B-blue)
![built with](https://img.shields.io/badge/built%20with-Claude-8A63D2)

</div>

---

## 🇬🇧 English

A single-page, Bloomberg-style **portfolio terminal** powered by **Claude agents**. Add any holdings
— stocks, ETFs, cash, gold, crypto — get live net-worth, AI-generated risk findings, news
sentiment, index benchmarks and rebalance recommendations. **Zero runtime dependencies** (Python
stdlib only, no `pip install`).

> ⚠️ Educational sandbox — **not investment advice**. Prices are indicative and may be delayed.

### ✨ Key features

| | |
|---|---|
| 🔌 **Plug-and-play** | Search assets by name (*"Apple"*, *"Bitcoin"*), ticker resolved automatically |
| 🧠 **Real AI analysis** | `reviewer` subagent flags concentration, FX and single-asset risks — not rule templates |
| 💹 **Any asset class** | Equities (NASDAQ/BIST/XETRA/…), cash (multi-currency), commodities, crypto — normalized live |
| 📰 **News & sentiment** | Per-ticker headlines + positive/negative/neutral sentiment scoring via Claude |
| 📊 **Index benchmarking** | Portfolio return vs BIST100, S&P 500, Gold over 30 days — alpha computed |
| ⚖️ **Rebalance advisor** | Current vs target allocation → buy/sell trade list with amounts |
| 🎯 **11 finance skills** | Full Anthropic finance-agent template suite (pitch, KYC, audit, reconciler, closer, …) |
| 🪙 **Token tracking** | Every Claude run counted — total tokens visible in the top bar |
| 🐳 **Zero deps** | `./start.sh` or `docker compose up` — no framework, no build step |
| 🔒 **Privacy-first** | Your holdings stay local (gitignored); only `*.sample` data is shared |

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

One page, F-key navigation, no tabs, no routing:

| Key | Panel | What it shows |
|---|---|---|
| — | **Hero band** | Net-worth · daily P&L · trend sparkline · allocation bar · data quality · token badge |
| — | **Risk ribbon** | Top AI finding (click → F8) |
| — | **Positions** | Holdings: qty · live price · value · weight · class (dynamic, any portfolio) |
| — | **Pipeline** | Visual 6-phase AI workflow animation + quick refresh button |
| `F3` | **News** | Per-ticker headlines + recency badge (NEW / 7D / OLD) |
| `F4` | **Index** | 30-day return: portfolio vs BIST100 vs S&P500 vs Gold + alpha |
| `F5` | **Scenario** | Bear / base / bull derived from live prices |
| `F6` | **Allocation** | Asset-class % + currency exposure + FX sensitivity table |
| `F7` | **Market watch** | Your holdings (★) + watchlist, live |
| `F8` | **Risk findings** | `reviewer` subagent output, severity-sorted |
| `F9` | **Reports** | `output/*.md` skill outputs, markdown-rendered |
| `F10` | **History** | Daily net-worth trend + AI token usage |
| `F11` | **Rebalance** | Allocation delta → buy/sell list · price alerts |
| `F12` | **Mini CLI** | `help`, `portfolio`, `skills`, `ls`, … |
| modal | **⚙ Edit Portfolio** | Search by name → ticker auto-resolved → live pricing |

### 🧩 Agent composition

Reference implementation of Anthropic's **skill + connector + subagent** finance-agent pattern,
running natively on Claude Code:

| Concept | Here | Location |
|---|---|---|
| **Skill** (instructions + domain knowledge) | 11 Agent Skills | `.claude/skills/<name>/SKILL.md` |
| **Connector** (data access) | Claude WebFetch · Yahoo Finance APIs | `connectors/live-quotes/` |
| **Subagent** (sub-task agent) | 5 specialised agents | `.claude/agents/<name>.md` |
| **Workflow** (orchestration) | `finops-full-pipeline` (6 phases) | `.claude/workflows/` |

#### Skills (11)

| Skill | What it does |
|---|---|
| `finops-agent` | Portfolio net-worth orchestrator — intake → connector → review → synthesis |
| `market-researcher` | Live stock/sector research: news, catalysts, risks |
| `valuation-reviewer` | P/E, EV/EBITDA, peer comparison — expensive or cheap? |
| `model-builder` | FX path, bear/base/bull, accumulation scenario projections |
| `earnings-reviewer` | Earnings vs consensus summary |
| `pitch-builder` | Investment pitch: bull/bear/balanced, price target logic |
| `meeting-preparer` | Pre-meeting brief for earnings / investor-day / board meetings |
| `statement-auditor` | Balance sheet / income statement / cash-flow audit + red flags |
| `gl-reconciler` | Bank statement → classify → match portfolio → reconciliation report |
| `month-end-closer` | Monthly P&L, peak/trough, FX impact, token usage from history |
| `kyc-screener` | 5-dimension KYC: identity, sanctions, legal, transparency, media |

#### Subagents (5)

| Agent | Role |
|---|---|
| `data-retriever` | Fetches live quotes from Yahoo Finance, normalizes to base currency |
| `reviewer` | AI risk analysis: concentration, FX exposure, single-asset dominance |
| `news-sentiment` | Per-ticker news + sentiment score (−2 very negative → +2 very positive) |
| `benchmark-tracker` | 30-day portfolio return vs BIST100, S&P500, Gold — alpha computed |
| `rebalancer` | Current vs target allocation → buy/sell trade list with TRY amounts |

### 🏗️ Architecture

Two independent data paths share one `output/latest.json`:

```
                       ┌─ POST /api/refresh ─→ live_refresh() [Python, no LLM] ──┐
   Terminal UI ────────┤                                                           ├─→ output/latest.json → UI
                       └─ POST /api/run ─→ signal file ─→ Claude watcher ─→ workflow ┘
```

- **Path A — fast, free:** Python reads `portfolio.json`, fetches Yahoo quotes, values all holdings,
  writes `output/latest.json`. Powers the 🔄 button and the 5-min auto-tick. Zero tokens.
- **Path B — AI analysis (1–4 min):** ▶ writes a signal file — the server never spawns Claude
  directly (RCE safety). An already-open Claude session (watcher) sees the signal and runs the
  6-phase workflow.

**6-phase workflow** (`finops-full-pipeline.js`):

```
1 Intake    → validate portfolio.json
2 Connector → data-retriever: live quotes + FX normalization
3 Review    → reviewer: AI risk findings
4 Intel     → news-sentiment + benchmark-tracker (parallel)
5 Rebalance → rebalancer: allocation delta + trade list
6 Synthesis → compute breakdown, write latest.json + pipeline-status.json
```

### 📁 Project structure

```
index.html               → terminal UI (single page, no build step)
assets/css/terminal.css  → dark terminal theme
assets/js/terminal.js    → all UI logic (vanilla JS, no framework)
pipeline_server.py       → static server + /api bridge (stdlib only)
.claude/
  skills/                → 11 skill SKILL.md files
  agents/                → 5 subagent .md files
  workflows/             → finops-full-pipeline.js
connectors/live-quotes/  → Yahoo Finance connector notes
data/
  portfolio.sample.json  → example portfolio (your data stays gitignored)
  targets.sample.json    → example rebalance target allocation
output/                  → generated artifacts (gitignored; *.sample shared)
Dockerfile
docker-compose.yml
start.sh
.github/workflows/ci.yml
```

### 🔌 API reference

| Method · Path | Description |
|---|---|
| `GET /api/latest` | Current `output/latest.json` |
| `GET /api/history` | Daily net-worth + token totals |
| `GET /api/search?q=` | Yahoo symbol search (name → ticker) |
| `GET /api/portfolio` | Load holdings (for the edit modal) |
| `GET /api/news?ticker=` | Recent headlines for a ticker |
| `GET /api/benchmark?days=` | Portfolio vs index returns (default 30 days) |
| `GET /api/dividends` | Dividend yield/rate for all equity holdings |
| `GET /api/rebalance` | Current vs target allocation + trade list |
| `GET /api/alerts` | Saved price alerts |
| `POST /api/portfolio` | Save holdings → triggers live refresh |
| `POST /api/refresh` | Fetch live prices → recompute net-worth |
| `POST /api/run` | Write AI-analysis signal (watcher executes the workflow) |
| `POST /api/alerts` | Save price alerts |
| `POST /api/rebalance` | Compute rebalance on demand |
| `POST /api/record-run?tokens=N` | Log a pipeline run + token count |

### 📋 `portfolio.json` schema

```json
{
  "base_currency": "TRY",
  "holdings": [
    { "id": "NVDA",     "name": "NVIDIA",      "type": "equity",    "ticker": "NVDA",    "ccy": "USD", "quantity": 4 },
    { "id": "TRY_CASH", "name": "TL Cash",     "type": "cash",      "ccy": "TRY",        "amount": 100000 },
    { "id": "GOLD",     "name": "Gold (gram)",  "type": "commodity", "ticker": "GC=F",    "ccy": "USD", "quantity": 50 },
    { "id": "BTC",      "name": "Bitcoin",      "type": "crypto",    "ticker": "BTC-USD", "ccy": "USD", "quantity": 0.05 }
  ]
}
```

Valuation by type:

| type | formula |
|---|---|
| `cash` | `amount × fx(ccy → base)` |
| `equity` / `crypto` | `quantity × price(ticker) × fx(ccy → base)` |
| `commodity` | `quantity × price / unitDiv × fx(ccy → base)` — `unitDiv = 31.1035` for gram gold |

### 🤝 Contributing

1. Never commit real financial data — `.gitignore` keeps `data/*.json` and `output/*` local.
2. New skill: create `.claude/skills/<name>/SKILL.md` with `name` + `description` frontmatter.
3. New subagent: add `.claude/agents/<name>.md` following the existing contract pattern.
4. CI runs `python -m py_compile pipeline_server.py` + JSON validation on every push.

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### 📜 License

MIT — see [LICENSE](LICENSE).

**Not investment advice.** Prices may be delayed or indicative. Do your own research.

---

## 🇹🇷 Türkçe

**Claude agent'larıyla** çalışan, tek sayfalık Bloomberg-tarzı bir **portföy terminali**. Kendi
varlıklarını ekle — hisse, ETF, nakit, altın, kripto — anında canlı net-değer, AI risk bulguları,
haber sentiment analizi, endeks karşılaştırması ve yeniden dengeleme önerileri al. **Sıfır
çalışma-zamanı bağımlılığı** (sadece Python stdlib, `pip install` yok).

> ⚠️ Eğitim amaçlı sandbox — **yatırım tavsiyesi değildir**. Fiyatlar gecikmeli/indikatif olabilir.

### ✨ Özellikler

| | |
|---|---|
| 🔌 **Tak çalıştır** | İsimle ara (*"Tüpraş"*, *"Bitcoin"*), ticker'ı biz çözüyoruz |
| 🧠 **Gerçek AI analizi** | `reviewer` subagent konsantrasyon, FX ve tek-varlık risklerini işaretler |
| 💹 **Her varlık sınıfı** | Hisse (NASDAQ/BIST/XETRA/…), nakit, emtia, kripto — canlı normalize |
| 📰 **Haber & sentiment** | Ticker bazlı başlıklar + pozitif/negatif/nötr puanlama |
| 📊 **Endeks karşılaştırması** | Portföy getirisi vs BIST100, S&P500, Altın (30 gün) + alfa |
| ⚖️ **Yeniden dengeleme** | Mevcut vs hedef dağılım → alım/satım listesi + tutarlar |
| 🎯 **11 finans skill'i** | Anthropic finans-agent template setinin tamamı |
| 🪙 **Token takibi** | Her Claude çalıştırması sayılır, üst barda görünür |
| 🐳 **Sıfır bağımlılık** | `./start.sh` veya `docker compose up` — framework yok, build adımı yok |
| 🔒 **Gizlilik** | Gerçek varlıkların lokal kalır (gitignore'lu); sadece `*.sample` paylaşılır |

### 🚀 Hızlı başlangıç

```bash
git clone https://github.com/efaslantas/claude-finops.git
cd claude-finops
./start.sh            # → http://localhost:8765
```

**⚙ Portföy Düzenle**'ye tıkla, varlıklarını isimle ara, miktar gir, **Kaydet** — fiyatlar canlı yüklenir.

### 📜 Lisans

MIT — [LICENSE](LICENSE). **Yatırım tavsiyesi değildir.** Kendi araştırmanı yap.

---

<div align="center">
<sub>Built with <a href="https://claude.com/claude-code">Claude Code</a></sub>
</div>
