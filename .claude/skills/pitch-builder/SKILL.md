---
name: pitch-builder
description: Yatırım tezi oluşturucu — bir hisse için boğa/ayı/dengeli senaryo, katalizörler, riskler ve hedef fiyat mantığı oluştur. "pitch", "yatırım tezi", "bull case", "bear case", "değerleme" dendiğinde tetiklenir.
---

# Pitch Builder — Yatırım Tezi Oluşturucu

Bir hisse veya varlık için kapsamlı yatırım argümanı (bull/bear/balanced) üret.
Analist notu formatında: iş modeli özeti, katalizörler, riskler, hedef.
Anthropic "Pitch Builder" template'inin Claude-native karşılığı.

## Ne Zaman Tetiklenir
- "NVDA için bull case yaz"
- "TUPRS'e yatırım argümanı oluştur"
- "X hissesi için pitch deck"
- CLI: `pitch <ticker>` veya `pitch <ticker> bull|bear|balanced`

## Girdi
- Ticker veya şirket adı (zorunlu)
- Senaryo tipi: `bull` | `bear` | `balanced` (varsayılan: balanced)
- Zaman ufku: `kısa` (3 ay) | `orta` (1 yıl) | `uzun` (3 yıl) (varsayılan: orta)

## Veri Toplama Akışı

### Adım 1 — Güncel Fiyat & Temel Metrikler
```
Yahoo Finance API: /v8/finance/chart/<ticker>?range=1d
Yahoo Finance quoteSummary: /v10/finance/quoteSummary/<ticker>?modules=summaryDetail,financialData,defaultKeyStatistics
```
Al: piyasa değeri, F/K, PD/DD, EPS, gelir büyümesi, özsermaye getirisi

### Adım 2 — Son Haberler & Momentum
```
WebSearch: "<ticker> <şirket> latest news Q2 2025"
WebSearch: "<şirket> analyst price target upgrade downgrade 2025"
```

### Adım 3 — Sektör Bağlamı
```
WebSearch: "<sektör> outlook trends 2025 2026"
WebSearch: "<şirket> competitors market share"
```

### Adım 4 — Kazanç Geçmişi & Guidance
```
WebSearch: "<şirket> earnings beat miss guidance 2024 2025"
```

## Senaryo Yapısı

### BULL CASE
- **Ana Tema** (tek cümle — neden bu hisse)
- **3 Katalizör** (somut, zaman bazlı)
- **Hedef Fiyat Mantığı** (F/K × tahmini EPS veya DCF mantığı)
- **Risk/Ödül** oranı
- **Zaman Çerçevesi**

### BEAR CASE
- **Ana Risk** (tek cümle)
- **3 Olumsuz Senaryo**
- **Destek Seviyeleri** (teknik eşikler)
- **Potansiyel Düşüş** (%)
- **Risk Tetikleyicileri**

### BALANCED
Her ikisini de yap + **Net Pozisyon** (mevcut fiyatta görüş)

## Değerleme Çerçevesi

**Hisse için:**
- Basit F/K karşılaştırması: hisse F/K vs sektör ortalama vs 5 yıllık ortalama
- Büyüme ayarlı F/K (PEG): F/K / EPS büyüme oranı
- Brüt/net marj trendi

**Emtia için:**
- Arz/talep dinamikleri
- Tarihsel fiyat aralığı (52 hafta, 5 yıl)
- Sezonsellik

**Kripto için:**
- Zincir metrikleri (on-chain data)
- Döngüsel konumlanma
- Makro korelasyon

## Rapor Çıktısı
`output/pitch-<ticker>-<YYYYMMDD>.md`:

```markdown
# <Şirket> (<Ticker>) — Yatırım Tezi (<tarih>)

## Pozisyon Özeti
**Öneri:** AL / TUT / SAT
**Senaryo:** BULL / BEAR / BALANCED
**Zaman Ufku:** 12 ay
**Hedef Fiyat:** <para> (<tarih> itibarıyla; yatırım tavsiyesi değil)
**Mevcut Fiyat:** <para>
**Potansiyel:** +/-X%

---

## İş Modeli (2 paragraf)
...

## Bull Case
### Ana Tema
### Katalizörler
### Hedef Fiyat Mantığı
### Risk/Ödül

## Bear Case
### Ana Risk
### Olumsuz Senaryolar
### Destek Seviyeleri

## Temel Metrikler
| Metrik | Değer | Sektör Ort. | Yorum |
|---|---|---|---|
| F/K | | | |
| EPS Büyüme | | | |
| Marj | | | |

## Portföy Notu
(Bu varlık portföyde varsa: mevcut ağırlık, P&L katkısı)

## Sınırlar
- Kamuya açık veriler, gecikmeli.
- Bu bir yatırım tavsiyesi değildir.
- Tarih: <bugün>
```

## Kurallar
- Her iddiaya kaynak veya veri dayanağı ekle.
- Hedef fiyat = hesaplama zinciri göster (X F/K × Y EPS = Z).
- "Uydurma yok" — veri yoksa "yeterli veri bulunamadı" yaz.
- Portföyde varsa (`data/portfolio.json`) güncel ağırlığı da belirt.

## Bağlı Dosyalar
- Subagent: `.claude/agents/data-retriever.md`
- Subagent: `.claude/agents/news-sentiment.md`
- Input: `data/portfolio.json` (portföy bağlamı)
- Output: `output/pitch-<ticker>-<YYYYMMDD>.md`
