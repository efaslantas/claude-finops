# Claude FinOps Terminal — Personal Instance

> Claude-native **finans agent terminal'i** — portföyün canlı net-değeri, risk analizi,
> senaryo projeksiyonları, haber sentiment, endeks karşılaştırması ve yeniden dengeleme.
> Tek Bloomberg-tarzı ekranda.
>
> _Personal/hardcoded branch. Public generic version: [efaslantas/claude-finops](https://github.com/efaslantas/claude-finops)_

![status](https://img.shields.io/badge/status-personal-orange) ![license](https://img.shields.io/badge/license-MIT-blue) ![deps](https://img.shields.io/badge/runtime%20deps-0-brightgreen)

---

## Nedir?

Anthropic'in finans-agent kompozisyonunu (**skill + connector + subagent**) Claude Code'un native
yapısı üzerinde prototipleyen kişisel laboratuvar. Bu branch hardcoded portföy verisi içerir;
herkese açık, generic versiyon için `feature/multi-user-setup` branch'ine bak.

## Kurulum

```bash
./start.sh          # http://localhost:8765
```

Veri girişi: `data/portfolio.json` (gitignore'lu, commit edilmez).

## Akış

```
data/portfolio.json → data-retriever (canlı fiyat) → reviewer (AI risk) → output/latest.json → UI
```

Tam pipeline: `finops-full-pipeline` workflow (6 aşama):
Intake → Connector → Review → Intel (haber+endeks) → Rebalance → Synthesis

## Skill Suite (11)

| Skill | Ne yapar |
|---|---|
| `finops-agent` | Net-değer orkestratörü |
| `market-researcher` | Canlı hisse/sektör araştırması |
| `valuation-reviewer` | P/E, EV/EBITDA, peer kıyası |
| `model-builder` | FX yolu, bear/base/bull projeksiyonları |
| `earnings-reviewer` | Kazanç vs konsensüs özeti |
| `pitch-builder` | Yatırım pitchi: bull/bear/balanced |
| `meeting-preparer` | Toplantı öncesi brifing |
| `statement-auditor` | Bilanço/gelir/nakit akış denetimi |
| `gl-reconciler` | Banka ekstresi → mutabakat raporu |
| `month-end-closer` | Aylık P&L + kur etkisi |
| `kyc-screener` | 5 boyutlu KYC taraması |

## Subagent'lar (5)

`data-retriever` · `reviewer` · `news-sentiment` · `benchmark-tracker` · `rebalancer`

## UI Panelleri (F-tuşları)

`F3` Haberler · `F4` Endeks · `F5` Senaryo · `F6` Dağılım · `F7` Piyasa · `F8` Bulgular ·
`F9` Raporlar · `F10` Geçmiş · `F11` Rebalans · `F12` CLI

## Gizlilik Kontrol Listesi

Fork/push öncesi doğrula:

- [ ] `git status` — `data/portfolio.json` ve `output/*.json|*.md` **takip edilmiyor** olmalı
- [ ] `index.html` / `terminal.js` içinde gerçek bakiye/tutar yok
- [ ] Hiçbir secret / API anahtarı yok

## Lisans

MIT. **Yatırım tavsiyesi değildir.**
