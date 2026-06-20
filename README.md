<div align="center">

# 📊 EFA FinOps Terminal

**Claude-native portfolio terminal — live net-worth, AI risk analysis, scenario & token tracking.**
**Claude-native portföy terminali — canlı net-değer, AI risk analizi, senaryo & token takibi.**

[English](#-english) · [Türkçe](#-türkçe)

![status](https://img.shields.io/badge/status-active-brightgreen) ![license](https://img.shields.io/badge/license-MIT-blue) ![runtime deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen) ![python](https://img.shields.io/badge/python-3.8%2B-blue) ![built with](https://img.shields.io/badge/built%20with-Claude-8A63D2)

![EFA FinOps Terminal](docs/banner.svg)

</div>

---

## 🇬🇧 English

A single-screen, Bloomberg-style **portfolio terminal** powered by **Claude agents**. Plug in your own
holdings — stocks, cash, gold, crypto — and get a live net-worth, AI-generated risk findings,
scenario projections and a clean activity feed. **Zero runtime dependencies** (Python stdlib only).

> ⚠️ Educational sandbox — **not investment advice**. Prices may be delayed/indicative.

### ✨ Why you'll like it

- **🔌 Plug-and-play portfolio** — search by name (*"Apple"*, *"Tüpraş"*, *"Bitcoin"*), we resolve the
  Yahoo ticker for you. No need to know symbols.
- **🧠 Real AI analysis** — a `reviewer` subagent flags concentration, FX and single-asset risks with
  severity levels — not rule-based templates.
- **💹 Any asset** — equities (NASDAQ/BIST/XETRA…), cash (TRY/USD/EUR), commodities (gold/silver),
  crypto (BTC/ETH…). Everything normalized to your base currency, live.
- **📈 One screen** — net-worth + daily P&L + trend, positions, allocation, scenarios, market watch,
  AI findings, history & token usage — all in a clean terminal.
- **🪙 Token-aware** — every Claude analysis run is counted; see total tokens spent in the top bar.
- **🐳 Zero deps + Docker** — stdlib-only server, one `./start.sh` or `docker compose up`.
- **🔒 Privacy-first** — your real holdings stay local (gitignored); only `*.sample` data is shared.

### 🚀 Quick start

```bash
git clone https://github.com/efaslantas/claude-finops.git
cd claude-finops
./start.sh            # → http://localhost:8765
```

Then click **⚙ Edit Portfolio**, search your assets by name, set quantities, **Save** — prices load live.

Docker:
```bash
docker compose up --build   # → http://localhost:8765
```

### 🧩 How it works — the Claude agent composition

This is a reference implementation of Anthropic's **skill + connector + subagent** finance-agent pattern,
running natively on Claude Code:

| Concept | Here | Location |
|---|---|---|
| **Skill** (instructions + domain) | 5 Agent Skills | `.claude/skills/<name>/SKILL.md` |
| **Connector** (data access) | Claude WebFetch / Yahoo Finance | `connectors/live-quotes/` |
| **Subagent** (sub-task) | data-retriever + reviewer | `.claude/agents/<name>.md` |

```
data/portfolio.json
      │  intake
      ▼
data-retriever (live prices)  →  reviewer (AI risk analysis)
      │
      ▼
output/latest.json  →  terminal UI  (pipeline_server.py · /api/*)
```

**5 skills:** `finops-agent` (net-worth) · `market-researcher` · `valuation-reviewer` ·
`model-builder` · `earnings-reviewer`.

### 🖥️ The screen (F-keys)

`F5` Scenario · `F6` Allocation · `F7` Market watch · `F8` Risk findings · `F9` Reports ·
`F10` History & tokens · `F12` Mini CLI.

### 📁 Structure

```
index.html · assets/        → terminal UI (single page, no build)
pipeline_server.py          → static server + /api bridge (stdlib only)
.claude/skills · agents · workflows  → the AI agent composition
data/*.sample.json          → example portfolio (yours stays gitignored)
Dockerfile · docker-compose.yml · .github/workflows/ci.yml
```

### 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Rule #1: **never commit real financial data** — `.gitignore`
keeps `data/*.json` and `output/*` local; only `*.sample.json` is shared.

### 📜 License

MIT — see [LICENSE](LICENSE). **Not investment advice.** Do your own research.

---

## 🇹🇷 Türkçe

**Claude agent'larıyla** çalışan, tek ekranlık Bloomberg-tarzı bir **portföy terminali**. Kendi
varlıklarını gir — hisse, nakit, altın, kripto — anında canlı net-değer, AI risk bulguları, senaryo
projeksiyonları ve temiz bir aktivite akışı al. **Sıfır çalışma-zamanı bağımlılığı** (sadece Python stdlib).

> ⚠️ Eğitim amaçlı sandbox — **yatırım tavsiyesi değildir**. Fiyatlar gecikmeli/indikatif olabilir.

### ✨ Neden hoşuna gidecek

- **🔌 Tak çalıştır portföy** — isimle ara (*"Apple"*, *"Tüpraş"*, *"Bitcoin"*), Yahoo ticker'ını biz
  buluruz. Sembolü bilmene gerek yok.
- **🧠 Gerçek AI analizi** — `reviewer` subagent'ı konsantrasyon, FX ve tek-varlık risklerini
  önem seviyesiyle (KRİTİK/ÖNEMLİ/ÖNERİ) işaretler — kural-tabanlı şablon değil.
- **💹 Her varlık türü** — hisse (NASDAQ/BIST/XETRA…), nakit (TRY/USD/EUR), emtia (altın/gümüş),
  kripto (BTC/ETH…). Hepsi baz para birimine canlı çevrilir.
- **📈 Tek ekran** — net-değer + günlük P&L + trend, pozisyonlar, dağılım, senaryolar, piyasa takibi,
  AI bulguları, geçmiş & token kullanımı — hepsi temiz bir terminalde.
- **🪙 Token farkında** — her Claude analiz çalıştırması sayılır; harcanan toplam token üst barda görünür.
- **🐳 Sıfır bağımlılık + Docker** — stdlib-only sunucu, tek `./start.sh` ya da `docker compose up`.
- **🔒 Gizlilik önce** — gerçek varlıkların lokal kalır (gitignore'lu); sadece `*.sample` veri paylaşılır.

### 🚀 Hızlı başlangıç

```bash
git clone https://github.com/efaslantas/claude-finops.git
cd claude-finops
./start.sh            # → http://localhost:8765
```

Sonra **⚙ Portföy Düzenle**'ye tıkla, varlıklarını isimle ara, miktar gir, **Kaydet** — fiyatlar canlı yüklenir.

Docker:
```bash
docker compose up --build   # → http://localhost:8765
```

### 🧩 Nasıl çalışır — Claude agent kompozisyonu

Anthropic'in **skill + connector + subagent** finans-agent kalıbının Claude Code üzerinde native
referans uygulamasıdır:

| Kavram | Buradaki | Konum |
|---|---|---|
| **Skill** (talimat + domain) | 5 Agent Skill | `.claude/skills/<ad>/SKILL.md` |
| **Connector** (veri erişimi) | Claude WebFetch / Yahoo Finance | `connectors/live-quotes/` |
| **Subagent** (alt görev) | data-retriever + reviewer | `.claude/agents/<ad>.md` |

```
data/portfolio.json
      │  intake
      ▼
data-retriever (canlı fiyat)  →  reviewer (AI risk analizi)
      │
      ▼
output/latest.json  →  terminal UI  (pipeline_server.py · /api/*)
```

**5 skill:** `finops-agent` (net-değer) · `market-researcher` · `valuation-reviewer` ·
`model-builder` · `earnings-reviewer`.

### 🖥️ Ekran (F-tuşları)

`F5` Senaryo · `F6` Dağılım · `F7` Piyasa takibi · `F8` Risk bulguları · `F9` Raporlar ·
`F10` Geçmiş & token · `F12` Mini CLI.

### 🤝 Katkı

[CONTRIBUTING.md](CONTRIBUTING.md)'ye bak. Kural #1: **gerçek finansal veriyi asla commit etme** —
`.gitignore` `data/*.json` ve `output/*`'ı lokal tutar; sadece `*.sample.json` paylaşılır.

### 📜 Lisans

MIT — [LICENSE](LICENSE). **Yatırım tavsiyesi değildir.** Kendi araştırmanı yap.

---

<div align="center"><sub>Built with <a href="https://claude.com/claude-code">Claude Code</a> · Banner is illustrative; capture a real screenshot to <code>docs/screenshot.png</code> and swap the image link.</sub></div>
