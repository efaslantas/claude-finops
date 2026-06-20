---
name: meeting-preparer
description: Toplantı öncesi brifing — şirket toplantısı, kazanç görüşmesi, analist günü veya yönetim görüşmesi öncesi hazırlık paketi. "toplantı hazırlığı", "earnings call", "investor day", "görüşme öncesi" dendiğinde tetiklenir.
---

# Meeting Preparer — Toplantı Hazırlık Brifing

Bir şirket toplantısı (kazanç görüşmesi, yatırımcı günü, yönetim görüşmesi) öncesi
kapsamlı hazırlık paketi üret: şirket durumu, gündem, sorulacak sorular, riskler.
Anthropic "Meeting Preparer" template'inin Claude-native karşılığı.

## Ne Zaman Tetiklenir
- "NVDA earnings call öncesi brifing hazırla"
- "Yarın ASELS yönetimiyle görüşmem var, hazırlık yap"
- "Yatırımcı günü için notlar"
- CLI: `meeting <şirket>` veya `meeting <şirket> <tarih>`

## Girdi
- Şirket adı ve/veya ticker (zorunlu)
- Toplantı tipi: `earnings` | `investor-day` | `management-meeting` | `board` (varsayılan: earnings)
- Toplantı tarihi (opsiyonel — yaklaşan tarih aranır)
- Rol: `analist` | `yatırımcı` | `kurul üyesi` (varsayılan: yatırımcı)

## Veri Toplama (paralel arama)

### 1. Son Sonuçlar & Guidance
```
WebSearch: "<şirket> Q4 2025 earnings results revenue EPS guidance"
WebSearch: "<ticker> last earnings beat miss consensus"
```

### 2. Gündem & Sunum Konuları
```
WebSearch: "<şirket> investor day agenda 2025 presentation"
WebSearch: "<şirket> earnings call transcript Q1 2025"
```

### 3. Son Gelişmeler (30 Gün)
```
WebSearch: "<şirket> news announcement product launch partnership 30 days"
WebSearch: "<ticker> analyst upgrade downgrade price target May June 2025"
```

### 4. Rekabetçi Bağlam
```
WebSearch: "<şirket> competitors market share 2025"
WebSearch: "<sektör> industry outlook Q2 2025"
```

### 5. Yönetim Tonu & Tarihsel Açıklamalar
```
WebSearch: "<şirket> CEO management comments guidance accuracy"
WebSearch: "<şirket> previous earnings call highlights"
```

## Brifing Yapısı

### HIZLI BRIFING (5 dk okuma)
```
Şirket: ...   |   Toplantı: ...   |   Tarih: ...

SON SONUÇLAR (en son çeyrek):
  Gelir: ₺/$ ... (YoY: ...)
  EPS: ... (Beklenti: ...)
  Hüküm: BEAT / MISS / IN-LINE

GÜNCEL FİYAT: ... (hedef: ...)

3 AÇIK SORU:
  1. ...
  2. ...
  3. ...
```

### TAM BRIFING PAKETİ

**A. Şirket Durumu Özeti**
- Piyasa konumu ve son performans
- Önceki guidance vs gerçekleşme
- Kilit metrik trendi (son 4 çeyrek)

**B. Gündem ve Beklentiler**
- Muhtemel konu başlıkları
- Analist konsensusu beklentisi
- Pozitif sürpriz alanları
- Risk alanları

**C. Sorular Paketi (toplantı tipine göre)**

*Earnings call için:*
- "Guidance'ı yukarı/aşağı revize ettiniz — hangi segment itici güç?"
- "Marj baskısı hangi kaleme bağlı ve ne zaman normalleşmesini bekliyorsunuz?"
- "FCF üretimi güçlendiğinde sermaye tahsisi önceliği ne?"

*Yönetim görüşmesi için:*
- Strateji uyum soruları
- Rekabetçi tehdit değerlendirmesi
- Ekip ve yetenek

*Yatırımcı günü için:*
- Uzun vadeli hedef ve kıyaslama
- Yeni iş kolu / ürün yol haritası

**D. Portföy Bağlamı**
- Bu hisse portföyde varsa: mevcut ağırlık, P&L
- Toplantı sonucu neye göre pozisyon değişir?

**E. Riskler ve Kırmızı Bayraklar**
- Güvenilirlik riski (geçmiş guidance tutarsızlığı)
- Sektörel baş rüzgar
- Spesifik şirket riskleri

## Rapor Çıktısı
`output/meeting-<şirket>-<YYYYMMDD>.md`:

```markdown
# <Şirket> Toplantı Brifing — <tarih>

## Hızlı Brifing (5 dk)
...

## Son Performans
...

## Gündem & Beklentiler
...

## Sorular (öncelik sırasıyla)
1. **[Kritik]** ...
2. **[Önemli]** ...
3. **[İzle]** ...

## Portföy Bağlamı
...

## Riskler
...

## Notlar İçin Boşluk
> Toplantı sırasında not al...

---
*Kaynak: kamuya açık veriler. Yatırım tavsiyesi değil. <tarih>*
```

## Kurallar
- Sorular somut ve spesifik — "nasıl gidiyor?" tipi genel soru yok.
- Tüm rakamları güncel kaynaklarla doğrula.
- Portföyde hisse varsa (`data/portfolio.json`) konumla bağlantı kur.
- Zaman kısıtlıysa "Hızlı Brifing" bölümünü üste taşı.

## Bağlı Dosyalar
- Subagent: `.claude/agents/news-sentiment.md`
- Subagent: `.claude/agents/data-retriever.md`
- Input: `data/portfolio.json`
- Output: `output/meeting-<şirket>-<YYYYMMDD>.md`
