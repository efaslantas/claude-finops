---
name: gl-reconciler
description: Genel muhasebe & banka ekstresi mutabakat — banka hareketlerini portföyle karşılaştır, fark ve açıklanamayan kalemleri bul. "mutabakat", "ekstre", "hesap dengele", "reconcile" dendiğinde tetiklenir.
---

# GL Reconciler — Muhasebe & Banka Mutabakat

Banka ekstrenizdeki işlemleri portföyünüzle (alım/satım/gelir/gider) karşılaştır;
eşleşmeyenleri, kayıp kalemleri ve açıklanamayan hareketleri bul.
Anthropic "General Ledger Reconciler" template'inin Claude-native karşılığı.

## Ne Zaman Tetiklenir
- "Banka ekstresini portföyle dengele"
- "Hangi işlemler eşleşmedi?"
- "Kayıp/fazla kalem var mı"
- CLI: `reconcile` veya `reconcile <dosya>`

## Girdi Formatları

### Banka Ekstresi (sırayla ara)
1. `data/bank-statement.csv` — sütunlar: `tarih, açıklama, tutar, bakiye`
2. `data/bank-statement.txt` — serbest metin, yapısal olmayabilir
3. CLI'ya yapıştırma

### Portföy Referansı
- `data/portfolio.json` — mevcut holdingler
- `output/latest.json` — değerlemeli anlık görüntü

## Akış (4 aşama)

### AŞAMA 1 — VERİ AK
Banka ekstresini parse et:
```json
{
  "period": { "from": "2025-01-01", "to": "2025-06-30" },
  "transactions": [
    { "date": "2025-03-15", "description": "NVDA SATIS", "amount": 37720, "type": "credit" },
    { "date": "2025-03-20", "description": "KOMISYON", "amount": -95, "type": "debit" }
  ],
  "opening_balance": ...,
  "closing_balance": ...,
  "net_change": ...
}
```

### AŞAMA 2 — SINIFLANDIR
Her bankha hareketini kategorize et:

| Kategori | Anahtar Kelime | Örnek |
|---|---|---|
| Hisse Alım | ALIM, BUY, ALIŞ | TUPRS ALIM |
| Hisse Satım | SATIM, SELL, SATIŞ | NVDA SATIŞ |
| Temettü | TEMETTÜ, DIVID | ASELS TEMETTÜ |
| Faiz | FAİZ, INTEREST, REPO | REPO FAİZ |
| Komisyon/Vergi | KOMİSYON, BSMV, STOPAJ | İŞLEM KOMİSYONU |
| Nakit Giriş | EFT, VIRMAN, TRANSFER | HAVALE GELİŞİ |
| Nakit Çıkış | EFT GÖN, ÇEKIM | ATM |
| Açıklanamayan | — | sınıflandırılamayan her şey |

### AŞAMA 3 — EŞLEŞTIR
Portföy hareketlerini banka hareketleriyle çapraz kontrol:
- Portföyde var ama bankada yok → KAYIP (banka kaydı eksik?)
- Bankada var ama portföyde yok → FAZLA (portföy güncel değil?)
- Her iki tarafta mevcut ama tutar farklı → TUTAR FARKI

Tolerans: ±0.1% (yuvarlama farkları)

### AŞAMA 4 — RAPOR YAZI
`output/reconciliation-<YYYYMMDD>.md`:

```markdown
# Muhasebe Mutabakat Raporu — <dönem>

## Özet
- Toplam işlem: N
- Eşleşen: N (₺...)
- Eşleşmeyen: N (₺...)
- Açıklanamayan: N

## Açık Kalemler — Aksiyon Gerekiyor
| # | Tarih | Açıklama | Tutar | Sorun | Öneri |
|---|---|---|---|---|---|

## Eşleşenler (özet)
...

## Kategori Dağılımı
| Kategori | Adet | Tutar |
|---|---|---|

## Dönem Sonu Bakiye Mutabakatı
- Banka kapanış bakiyesi: ₺...
- Portföy net değeri: ₺...
- Fark: ₺... → açıklama: ...

## Notlar
```

## Kurallar
- Tutarları eşleştirirken tarih, açıklama ve miktar üçlüsünü kullan.
- "Açıklanamayan" kalemleri asla sil — raporla.
- Kullanıcıdan eksik bilgi gerekirse sor (tarih aralığı, para birimi).

## Bağlı Dosyalar
- Input: `data/bank-statement.csv`, `data/portfolio.json`
- Output: `output/reconciliation-<YYYYMMDD>.md`
