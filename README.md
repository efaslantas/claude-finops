# EFA FinOps Terminal

> Claude-native **finans agent template'i** — bir portföyün canlı net-değerini, risk analizini ve
> senaryo projeksiyonlarını üreten; çıktıları Bloomberg-tarzı tek bir terminal ekranında gösteren sandbox.
>
> _A Claude-native finance-agent template: live net-worth, risk findings and scenario projections,
> rendered in a single Bloomberg-style terminal. UI/docs in Turkish._

![status](https://img.shields.io/badge/status-sandbox-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen) ![python](https://img.shields.io/badge/python-3.8%2B-blue)

![EFA FinOps Terminal](docs/banner.svg)

<sub>Üstteki temsilî banner. Gerçek ekran görüntüsü için `./start.sh` ile aç, terminali yakala ve `docs/screenshot.png` olarak kaydedip bu satırı onunla değiştir.</sub>

---

## Nedir?

Anthropic'in finans-agent kompozisyonunu (**skill + connector + subagent**) Claude Code'un native
yapısı üzerinde prototipleyen bir laboratuvar. Üç parça:

| Kavram | Karşılığı | Konum |
|---|---|---|
| **Skill** (talimat + domain bilgisi) | Agent Skill (markdown) | `.claude/skills/<ad>/SKILL.md` |
| **Connector** (veri erişimi) | Claude native web araçları (WebFetch/WebSearch) | `connectors/live-quotes/` |
| **Subagent** (alt görev) | Claude Code subagent | `.claude/agents/<ad>.md` |

Akış: **intake → connector'dan canlı veri → subagent'lara dağıt → `output/` artifact → terminal UI.**

> ⚠️ **Bu bir sandbox / öğrenme projesidir. Yatırım tavsiyesi değildir. Gerçek para hareketi yoktur.**

---

## Skill Suite (5 mod)

Hepsi `data-retriever` (canlı fiyat) + `reviewer` (denetim) subagent'larını paylaşır:

| Skill | Ne yapar |
|---|---|
| `finops-agent` | Portföy net-değeri + varlık kırılımı + FX senaryo |
| `market-researcher` | Hisse/sektör canlı araştırma (haber + katalizör + risk) |
| `valuation-reviewer` | Pahalı/ucuz çarpan analizi (P/E, peer kıyas) |
| `model-builder` | Senaryo & projeksiyon (FX yolu, bear/base/bull, birikim) |
| `earnings-reviewer` | Kazanç/bilanço özeti + beklenti kıyası |

---

## Terminal Ekranı

Tek sayfa, üstte **Hero KPI bandı** (net-değer + günlük P&L + trend + dağılım + veri kalitesi),
altında **risk şeridi**, F-tuşlarıyla detay panellerine atlama:

- **Hero bandı** · net-değer, günlük P&L, mini trend grafiği, varlık dağılımı, veri kalitesi
- **Risk şeridi** · en kritik AI bulgusu (tıkla → F8)
- **Trading Floor** · pixel-art agent animasyonu (Wall Street temalı, kompakt)
- **F5 Senaryo** · bear/base/bull, canlı fiyattan türetilir
- **F6 Dağılım** · varlık sınıfı + döviz maruziyeti
- **F7 Piyasa** · portföy (★) + izleme listesi, canlı
- **F8 Bulgular** · reviewer subagent AI bulguları (severity'li)
- **F9 Raporlar** · `output/*.md` skill çıktıları (markdown render)
- **F10 Geçmiş** · günlük net-değer trendi + AI token kullanımı

---

## Kurulum

### Seçenek A — Yerel (sıfır bağımlılık)

Yalnızca Python 3.8+ gerekir (sadece stdlib kullanılır, `pip install` yok):

```bash
git clone <repo-url> && cd efa-finops-agentic
./start.sh          # http://localhost:8765 açar
```

### Seçenek B — Docker

```bash
docker compose up --build
# → http://localhost:8765
```

İlk açılışta gerçek veriniz yoksa `*.sample.json` örnek verisi gösterilir.

### Veri girişi

```bash
cp data/portfolio.sample.json data/portfolio.json   # kendi miktarlarınızı girin
```

Canlı analizi Claude Code içinde çalıştırın:

```
/workflows finops-full-pipeline      # net-değer + bulgular → output/latest.json
# veya tek tek: "NVDA araştır", "ASELS pahalı mı", "TL %20 zayıflarsa"
```

Terminal `output/latest.json`'ı otomatik okur; pipeline yeni veri yazınca panel güncellenir.

---

## Mimarı

```
data/portfolio.json
      │  intake
      ▼
data-retriever (WebFetch → Yahoo Finance)   ← connector
      │  canlı fiyat, TRY normalize
      ▼
reviewer (metodoloji + risk analizi)        ← subagent
      │  bulgular (KRİTİK/ÖNEMLİ/ÖNERİ/BİLGİ)
      ▼
output/latest.json + output/*.md            ← artifact
      │  /api/latest · /api/reports
      ▼
index.html (terminal UI)                    ← pipeline_server.py
```

### Dosya yapısı

```
index.html           → terminal UI (tek sayfa)
assets/css/          → terminal.css
assets/js/           → terminal.js
pipeline_server.py   → statik sunucu + /api köprüsü (yalnızca stdlib)
.claude/skills/      → 5 skill (finops-agent, market-researcher, ...)
.claude/agents/      → data-retriever, reviewer
.claude/workflows/   → finops-full-pipeline.js (orkestrasyon)
data/                → portföy fixture'ları (*.sample.json paylaşılır)
output/              → üretilen artifact'lar (gitignore'lu; *.sample paylaşılır)
docs/                → mimari.excalidraw + ekran görüntüsü
Dockerfile · docker-compose.yml · start.sh · .github/workflows/ci.yml
```

---

## ⚠️ Yayın Öncesi Gizlilik Kontrol Listesi

Bu repo, kişisel finansal verinin **commit edilmemesi** için `.gitignore` ile korunur
(`data/*.json` ve `output/*.json|*.md` hariç tutulur, sadece `*.sample.json` paylaşılır).

Fork'lamadan / push'lamadan önce doğrulayın:

- [ ] `git status` — `data/portfolio.json` ve `output/latest.json` **takip edilmiyor** olmalı
- [ ] `index.html` ve `assets/js/terminal.js` içinde gerçek tutar/bakiye yok (örnek değerler var)
- [ ] `output/*.md` raporlarında kişisel analiz yok (gitignore'lu)
- [ ] Hiçbir secret / API anahtarı yok (bu proje anahtar kullanmaz)

---

## Katkı & Mimari

- Katkı rehberi: [CONTRIBUTING.md](CONTRIBUTING.md)
- Mimari diyagramı: [docs/mimari.excalidraw](docs/mimari.excalidraw) ([excalidraw.com](https://excalidraw.com)'da aç)
- CI: `python -m py_compile` + JSON doğrulama (`.github/workflows/ci.yml`)

## Lisans

MIT — bkz. [LICENSE](LICENSE).

**Yatırım tavsiyesi değildir.** Fiyatlar gecikmeli/indikatif olabilir. Kendi araştırmanızı yapın.
