---
name: statement-auditor
description: Finansal tablo denetçisi — bilanço/gelir tablosu/nakit akış metnini al, AI ile derinlemesine analiz et, kırmızı bayrak bul. "bilanço analiz et", "gelir tablosu", "finansal tablo" dendiğinde tetiklenir.
---

# Statement Auditor — Finansal Tablo Denetçisi

Bir şirketin bilanço, gelir tablosu veya nakit akış tablosunu AI ile denetle.
Anthropic "Statement Auditor" template'inin Claude-native karşılığı.

## Ne Zaman Tetiklenir
- "X şirketinin bilançosunu analiz et"
- "Gelir tablosunda sorun var mı"
- "Nakit akışı nasıl görünüyor"
- CLI'ya metin yapıştırılması: `audit <dosyaAdı>` veya `audit` (veri okur)

## Girdi Seçenekleri (sırayla kontrol et)
1. `data/statement.txt` veya `data/statement.md` — yapıştırılmış/kopyalanmış tablo metni
2. `data/statement.csv` — yapılandırılmış format
3. CLI'dan doğrudan metin girdisi (kullanıcı yapıştırır)
4. Ticker → WebSearch ile son kamuya açık raporu bul (Yahoo Finance, SEC/KAP)

## Akış (5 aşama)

### AŞAMA 1 — VERİ AL
- Yukarıdaki sırayla girdi kaynağını belirle.
- Hangi tablo: Bilanço | Gelir Tablosu | Nakit Akış | Hepsi?
- Dönem: Yıllık mı Çeyreklik mi? Hangi dönem?
- Para birimi, IFRS/GAAP/TFRS notu al.

### AŞAMA 2 — TABLO PARSE ET
Ham metinden yapısal veri çıkar:
```json
{
  "company": "...",
  "period": "Q4 2025",
  "currency": "TRY/USD/EUR",
  "income_statement": { "revenue": ..., "gross_profit": ..., "ebit": ..., "net_income": ... },
  "balance_sheet": { "total_assets": ..., "total_liabilities": ..., "equity": ... },
  "cash_flow": { "operating": ..., "investing": ..., "financing": ..., "net_change": ... }
}
```
Eksik alan varsa `null` bırak, uydurma yapma.

### AŞAMA 3 — ORAN ANALİZİ
Mevcut veriden hesaplanabilen oranları hesapla:

| Oran | Formül | Yorum Eşiği |
|---|---|---|
| Cari Oran | Dönen Varlık / KV Borç | <1.0 = kritik |
| Net Marj | Net Kâr / Gelir | negatif = bayrak |
| Borç/Özsermaye | Toplam Borç / Özsermaye | >2.0 = yüksek kaldıraç |
| Nakit Dönüşüm | Faaliyet Nakit / Net Kâr | <0 = kâr kalitesi sorunu |
| Büyüme (YoY) | (Bu dönem - Önceki) / Önceki | negatif gelir = bayrak |

Veri yoksa oranı "hesaplanamadı" olarak işaretle.

### AŞAMA 4 — DENETIM & KIRMIZI BAYRAKLAR
Sırası ile kontrol et:

**Kâr Kalitesi:**
- Faaliyet nakiti net kârdan düşük mü? (accrual riski)
- Alacaklar gelirden hızlı mı büyüyor? (revenue recognition sorunu)
- Gelir trendi ile nakit trendi ayrışıyor mu?

**Bilanço Sağlığı:**
- Stok birikimi (stoğun artış hızı vs gelir artışı)
- Şüpheli alacak karşılığı yeterli mi?
- Kısa vadeli borç / nakit oranı (likidite riski)

**Şeffaflık:**
- Dipnotlarda olağandışı kalem var mı? (yeniden yapılanma, tek seferlik gelir vs gider)
- Bağlı taraf işlemleri
- Muhasebe politikası değişikliği

### AŞAMA 5 — RAPOR YAZI
`output/statement-<şirket>-<YYYYMMDD>.md` dosyasına yaz:

```markdown
# <Şirket> Finansal Tablo Denetimi — <dönem> (<tarih>)

## Özet (1 cümle)
...

## Tespit Edilen Bulgular
| # | Önem | Bulgu | Veri |
|---|---|---|---|
| 1 | 🔴 KRİTİK | ... | ... |
| 2 | 🟡 ÖNEMLİ | ... | ... |

## Oran Tablosu
...

## Kâr Kalitesi Değerlendirmesi
...

## Likidite & Solvabilite
...

## Yönetim Gözlemi
(Kamuya açık mektup/açıklama varsa: tonlama, iyimserlik vs gerçekçilik kıyası)

## Sınırlar
Veriler kamuya açık/kullanıcı girdisi, gecikmeli olabilir. Yatırım tavsiyesi değil.
```

## Kurallar
- Rakam yoksa "hesaplanamadı" — uydurma yok.
- Her bulguya kaynak satır/sütun referansı ekle.
- Portföyde bu hisse varsa (`data/portfolio.json`) bağlantı kur.
- Yatırım tavsiyesi değil — açıkça belirt.

## Bağlı Dosyalar
- Input: `data/statement.txt` / `data/statement.csv`
- Subagent: `.claude/agents/reviewer.md`
- Output: `output/statement-<şirket>-<YYYYMMDD>.md`
