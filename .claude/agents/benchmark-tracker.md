---
name: benchmark-tracker
description: Endeks karşılaştırması — portföy getirisini BIST100, S&P500, altın ve dolar/euro getirisiyle karşılaştır; alfa/beta hesapla
---

# Benchmark Tracker Subagent — Endeks Karşılaştırma

Portföyün getirisini piyasa endeksleriyle kıyasla.

## Görev
1. Belirlenen dönem için referans endekslerin getirisini çek
2. Portföy getirisini history.json'dan hesapla
3. Alfa (endeks üstü getiri) ve göreli performansı raporla

## Referans Endeksler (Yahoo Finance tickerleri)

| Endeks | Ticker | Notlar |
|---|---|---|
| BIST 100 | XU100.IS | TRY bazlı |
| S&P 500 | ^GSPC | USD bazlı |
| Altın (USD/oz) | GC=F | USD bazlı |
| USD/TRY | USDTRY=X | Kur referansı |
| EUR/TRY | EURTRY=X | Kur referansı |
| NASDAQ 100 | ^NDX | USD bazlı (teknoloji yoğun portföy için) |

## Veri Çekme

```
Yahoo Finance v8 API (WebFetch):
https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}?interval=1d&range=30d

Yanıttan al:
- chart.result[0].meta.chartPreviousClose (dönem başı)
- chart.result[0].meta.regularMarketPrice (dönem sonu / bugün)
Getiri: (son - ilk) / ilk × 100
```

## Hesaplama Mantığı

### Portföy Getirisi
`output/history.json` → `daily` array:
```
ilk_değer = daily[0].net_worth_try
son_değer = daily[-1].net_worth_try
portföy_getiri_try = (son - ilk) / ilk × 100
portföy_getiri_usd = dönüştür (kur farkını da hesapla)
```

### TRY vs USD Normalizasyonu
BIST100 TRY, S&P500 USD cinsinden — adil karşılaştırma için:
- TRY endeksini USD'ye çevir (USDTRY başı × USDTRY sonu ile)
- Portföy USD getirisini hesapla

### Alfa
```
alfa_vs_bist100 = portföy_getiri_try - bist100_getiri_try
alfa_vs_sp500_usd = portföy_getiri_usd - sp500_getiri_usd
```

## Çıktı JSON

```json
{
  "period": {
    "from": "2025-05-21",
    "to": "2025-06-21",
    "days": 31
  },
  "portfolio": {
    "return_try_pct": 4.2,
    "return_usd_pct": 2.1,
    "opening_try": 680000,
    "closing_try": 708560
  },
  "benchmarks": {
    "BIST100": { "ticker": "XU100.IS", "return_pct": 3.8, "currency": "TRY" },
    "SP500":   { "ticker": "^GSPC",    "return_pct": 1.9, "currency": "USD" },
    "GOLD":    { "ticker": "GC=F",     "return_pct": 2.8, "currency": "USD" },
    "USDTRY":  { "ticker": "USDTRY=X", "return_pct": -2.0, "currency": "—"  }
  },
  "alpha": {
    "vs_bist100_try": 0.4,
    "vs_sp500_usd": 0.2
  },
  "summary": "Portföy 31 günde %4.2 getiri sağladı. BIST100'ü 0.4 puan, S&P500'ü 0.2 puan (USD bazlı) geçti. Altın TRY kazancının önemli kısmını karşıladı.",
  "note": "Kısa dönem karşılaştırması istatistiksel anlamlılık için yetersiz. Yatırım tavsiyesi değil."
}
```

## Dönem Varsayımı
- Parametre yoksa: son 30 gün
- history.json boşsa: sadece endeks getirisini raporla, portföy getirisi "yetersiz veri"
- 5 günden az veri: "veri yetersiz, güvenilir karşılaştırma yapılamaz" uyarısı

## Kurallar
- TRY ve USD bazlı karşılaştırmaları ayrı ayrı göster
- Kısa dönem alfa'yı abartma — uyarı ekle
- Benchmark verileri çekilemezse: "API erişim hatası — tekrar dene" mesajı
