---
name: month-end-closer
description: Aylık kapanış raporu — ay sonu portföy P&L, en iyi/kötü performanslar, kategori kırılımı, özet. "ay sonu", "aylık rapor", "month-end", "aylık kapanış" dendiğinde tetiklenir.
---

# Month-End Closer — Aylık Kapanış & P&L Raporu

Ay sonunda portföyün toplam performansını, varlık bazında P&L'i ve trend analizini raporla.
Anthropic "Month-End Closer" template'inin Claude-native karşılığı.

## Ne Zaman Tetiklenir
- "Haziran ayı nasıl kapandı"
- "Aylık rapor üret"
- "Bu ayki kâr/zarar neydi"
- CLI: `month-end` veya `month-end 2025-06`

## Girdi Kaynakları
1. `output/history.json` — günlük net-değer kayıtları (birincil kaynak)
2. `output/latest.json` — son değerleme (cari ay sonu)
3. `data/portfolio.json` — holding detayları
4. `output/*.md` raporlar — dönem içi skill çıktıları

## Akış (4 aşama)

### AŞAMA 1 — DÖNEM BELİRLE
- Hangi ay? (varsayılan: son tamamlanan ay)
- `output/history.json`'dan dönem ilk ve son günlerini bul.
- Yeterli veri var mı? (en az 5 veri noktası önerilir)

```json
{
  "period": "2025-06",
  "opening_date": "2025-06-01",
  "closing_date": "2025-06-30",
  "data_points": 22
}
```

### AŞAMA 2 — P&L HESAPLA
History.json'dan:
- **Açılış değeri** (ayın ilk günü net_worth_try)
- **Kapanış değeri** (ayın son günü net_worth_try)
- **Dönem P&L** = kapanış - açılış (₺ ve %)
- **En yüksek gün** (peak) ve **en düşük gün** (trough)
- **Volatilite** (günlük değişimlerin std sapması, yaklaşık)

Kur normalizasyonu:
- USD P&L = (kapanış_try / usdtry_son) - (açılış_try / usdtry_ilk)
- Kur etkisi = (usdtry_son - usdtry_ilk) × usd_pozisyon_miktarı

### AŞAMA 3 — AY İÇİ OLAYLAR
- Skill çalıştırmaları (`output/` içi .md dosyaları)
- Token harcaması (`history.json` → `runs`)
- Öne çıkan haber/event (WebSearch: portföy hisselerinin ay içi haberleri)

### AŞAMA 4 — RAPOR YAZI
`output/month-end-<YYYY-MM>.md`:

```markdown
# <YYYY-MM> Aylık Kapanış Raporu

## Performans Özeti
| Metrik | Değer |
|---|---|
| Açılış | ₺... / $... |
| Kapanış | ₺... / $... |
| Dönem P&L | ₺... (%...) |
| Peak | ₺... (<tarih>) |
| Trough | ₺... (<tarih>) |

## Varlık Sınıfı Katkısı (tahmini)
| Sınıf | Başlangıç % | Bitiş % | Etki |
|---|---|---|---|
| Emtia | | | |
| Nakit | | | |
| Hisse | | | |

## Ay İçi Önemli Gelişmeler
- ...

## Token & Analiz Kullanımı
- Pipeline çalıştırma: N kez
- Harcanan token: ~N k
- Üretilen rapor: N adet

## Dikkat Noktaları (AI Değerlendirmesi)
- ...

## Bir Sonraki Ay İçin Gündem
- ...

---
*Veriler output/history.json ve output/latest.json kaynaklı. Yatırım tavsiyesi değil.*
```

## Kurallar
- Veri yoksa "yetersiz veri" yaz, tahminde bulunma.
- Tüm TRY değerleri için binlik ayraç (₺1.234.567 formatı).
- `history.json` boşsa kullanıcıyı yönlendir: "Önce `/api/refresh` çalıştır".

## Bağlı Dosyalar
- Input: `output/history.json`, `output/latest.json`, `data/portfolio.json`
- Subagent: `.claude/agents/reviewer.md`
- Output: `output/month-end-<YYYY-MM>.md`
