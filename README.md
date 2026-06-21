# Claude FinOps Terminal — Personal Instance

> Claude-native **finans agent terminali** — portföyün canlı net-değeri, AI risk analizi,
> makro stres testi, PDF rapor okuma, vergi hasadı, haber sentiment, endeks karşılaştırması.
> Tek Bloomberg-tarzı ekranda.
>
> _Personal/hardcoded branch. Public open-source version: [efaslantas/claude-finops](https://github.com/efaslantas/claude-finops)_

![status](https://img.shields.io/badge/status-personal-orange) ![skills](https://img.shields.io/badge/skills-14-purple) ![deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

---

## Neden Claude?

| Claude kapasitesi | Burada nasıl kullanılıyor |
|---|---|
| **200k bağlam** | 200 sayfalık yıllık raporu tek geçişte oku |
| **Vision / PDF** | 10-K, banka ekstresi, grafik ekran görüntüsü — OCR gerekmez |
| **Extended thinking** | DCF, makro duyarlılık zinciri, vergi optimizasyonu adım adım |
| **Paralel subagent** | Haber sentiment + endeks karşılaştırması aynı anda |
| **Tool use** | Yahoo Finance connector — middleware yok, API anahtarı yok |
| **Çok dilli** | Türkçe/İngilizce finansal analiz, tam bağlamla |
| **Structured output** | JSON şema ile risk bulguları, portföy verisi |

## Kurulum

```bash
./start.sh          # http://localhost:8765
```

Veri: `data/portfolio.json` (gitignore'lu).
Cost basis için: `cost_basis_per_unit` + `purchase_date` alanlarını ekle (vergi hasadı için).

## 14 Skill

| Skill | Claude kapasitesi |
|---|---|
| `finops-agent` | Tool use, structured output |
| `market-researcher` | Web search, long context |
| `valuation-reviewer` | Reasoning, web fetch |
| `model-builder` | Reasoning, structured output |
| `earnings-reviewer` | Web fetch, reasoning |
| `pitch-builder` | Reasoning, web search |
| `meeting-preparer` | Web search, long context |
| `statement-auditor` | Long context, reasoning |
| `gl-reconciler` | Long context, structured output |
| `month-end-closer` | Long context, reasoning |
| `kyc-screener` | Web search, reasoning |
| **`pdf-analyzer`** | **Vision, 200k context** |
| **`macro-stress`** | **Extended thinking** |
| **`tax-harvester`** | **Reasoning, structured output** |

## 5 Subagent

`data-retriever` · `reviewer` · `news-sentiment` · `benchmark-tracker` · `rebalancer`

## UI Panelleri (F-tuşları)

`F3` Haberler · `F4` Endeks · `F5` Senaryo · `F6` Dağılım · `F7` Piyasa · `F8` Bulgular ·
`F9` Raporlar · `F10` Geçmiş · `F11` Rebalans · `F12` CLI

## 6-Aşamalı Pipeline

```
Intake → Connector → Review → Intel (parallel) → Rebalance → Synthesis
```

## Gizlilik Kontrol Listesi

- [ ] `data/portfolio.json` ve `output/*` commit edilmiyor
- [ ] `index.html`/`terminal.js` içinde gerçek bakiye yok
- [ ] Secret / API anahtarı yok

## Lisans

MIT. **Yatırım tavsiyesi değildir.**
