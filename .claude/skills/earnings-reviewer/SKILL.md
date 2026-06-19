---
name: earnings-reviewer
description: Bir şirketin son kazanç/bilanço açıklamasını özetler ve değerlendirir — gelir, kâr, marj, beklenti karşılaştırması, yönetim guidance. "X bilançosu", "kazanç açıkladı mı", "NVDA earnings" dendiğinde tetiklenir.
---

# Earnings Reviewer — Kazanç & Bilanço Değerlendirici

Bir şirketin **son çeyrek/yıllık kazanç açıklamasını** bul, özetle, beklentiyle kıyasla.
Anthropic "Earnings Reviewer" template'inin Claude-native karşılığı.

## Ne zaman tetiklenir
- "NVDA bilançosu nasıldı" / "ASELS kazanç açıkladı mı"
- "son çeyrek sonuçları" / "earnings beat mi miss mi"
- portföydeki bir hissenin yeni rakam açıklaması sonrası

## Akış (4 aşama)

### AŞAMA 1 — HEDEF & DÖNEM
- Hangi şirket, hangi dönem (son çeyrek mi, belirli Q mu)?
- Açıklama tarihi geçti mi, yaklaşıyor mu? (WebSearch ile teyit)

### AŞAMA 2 — RAKAMLARI BUL (WebSearch + WebFetch)
Son açıklamadan çek (her sayıya **tarih + kaynak**):
- Gelir (revenue) — YoY büyüme
- Net kâr / EPS — YoY
- Brüt/faaliyet marjı
- Beklenti (consensus) karşılaştırması: beat / in-line / miss
- Segment kırılımı (varsa: ör. NVDA Data Center)
- Yönetim guidance (gelecek çeyrek beklentisi)
**Rakam bulunamazsa uydurma — "açıklanmadı / bulunamadı" yaz.**

### AŞAMA 3 — DEĞERLENDİR
- Beklentiyi geçti mi, neden? (hangi segment çekti)
- Marj trendi iyileşiyor mu kötüleşiyor mu?
- Guidance piyasa beklentisinin üstünde/altında mı?
- Hisse fiyatı açıklamaya nasıl tepki verdi? (subagent: data-retriever — güncel fiyat)

### AŞAMA 4 — SENTEZ → output
`output/earnings-<ticker>-<YYYYMMDD>.md` yaz:

```markdown
# <Ticker> Kazanç İncelemesi — <dönem> (<tarih>)

## Hüküm (1 satır)
BEAT / IN-LINE / MISS — ana sebep.

## Rakamlar
| Metrik | Sonuç | YoY | Beklenti | Sapma | Kaynak |
|---|---|---|---|---|---|
| Gelir | ... | +%.. | ... | beat/miss | |
| EPS | ... | | | | |
| Faaliyet marjı | ... | | | | |

## Segmentler / Sürücüler
- ...

## Guidance (gelecek dönem)
- Yönetim: ... → beklentiye göre üstünde/altında

## Fiyat Tepkisi
- Açıklama sonrası: ±%... (kaynak, saat)

## Portföy Notu (varsa)
- Bu hisse portföyde X adet = ₺... → çeyrek sonucu pozisyona etkisi

## Sınırlar
- Rakamlar kamuya açık kaynaklardan, gecikmeli olabilir. Yatırım tavsiyesi değil.
```

## Kurallar
- **Tarih kritik:** Hangi çeyrek, açıklama ne zaman. Eski çeyreği yeni gibi sunma.
- **Beklenti kaynağı:** Consensus rakamı varsa kaynağını yaz; yoksa "beklenti bulunamadı".
- **Uydurma yok:** Açıklanmamış rakamı tahmin etme.
- **Yatırım tavsiyesi değil.**

## Bağlı dosyalar
- Subagent: `.claude/agents/data-retriever.md` (fiyat tepkisi)
- Subagent: `.claude/agents/reviewer.md`
- Data: `data/portfolio.json` (portföy etkisi)
- Output: `output/earnings-<ticker>-<YYYYMMDD>.md`
