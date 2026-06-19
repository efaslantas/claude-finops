---
name: valuation-reviewer
description: Bir hissenin pahalı/ucuz olup olmadığını çarpan analizi ile değerlendirir — P/E, P/B, EV/EBITDA, peer kıyas, analist hedefi. "X pahalı mı", "değerleme yap", "NVDA ucuz mu" dendiğinde tetiklenir.
---

# Valuation Reviewer — Çarpan & Değerleme Analizi

Bir hissenin **pahalı mı ucuz mu** olduğunu çarpan-tabanlı çerçeveyle değerlendir.
Anthropic "Valuation Reviewer" template'inin Claude-native karşılığı.

## Ne zaman tetiklenir
- "NVDA pahalı mı?" / "ASELS ucuz mu?" / "Tüpraş'ın değerlemesi nasıl"
- "şu fiyat makul mu" / "peer'larına göre nerede"
- finops-agent / market-researcher sonrası bir pozisyonu derinleştirmek için

## Akış (4 aşama)

### AŞAMA 1 — HEDEF & PEER SET
- Hangi hisse, hangi piyasa?
- Karşılaştırma grubu (peer): aynı sektör 2-4 hisse
  - NVDA → AMD, AVGO, TSM
  - ASELS → savunma peer (yerli/global)
  - TUPRS → rafineri peer
  - GOOGL → META, MSFT

### AŞAMA 2 — CANLI VERİ (subagent: data-retriever + WebSearch)
Çek:
- Güncel fiyat (Yahoo v8)
- Çarpanlar: P/E (trailing & forward), P/B, EV/EBITDA, P/S — WebSearch ile
- Büyüme: gelir/kâr büyüme oranı (varsa)
- Analist konsensüs hedef fiyat & sayısı
**Bulunamayan çarpanı uydurma — "veri yok" yaz.**

### AŞAMA 3 — KIYAS & ÇERÇEVE
- Hissenin çarpanı peer ortalamasına göre prim/iskonto?
- Forward P/E vs büyüme (PEG mantığı): büyüme çarpanı haklı çıkarıyor mu?
- Tarihsel kendi aralığına göre nerede? (mümkünse)
- Analist hedefi cari fiyata göre ne ima ediyor (% upside/downside)?

### AŞAMA 4 — SENTEZ → output
`output/valuation-<ticker>-<YYYYMMDD>.md` yaz:

```markdown
# <Ticker> Değerleme — <tarih>

## Hüküm (1 satır)
PAHALI / MAKUL / UCUZ — neden (tek cümle).

## Çarpan Tablosu
| Metrik | <Ticker> | Peer ort. | Prim/İskonto | Kaynak |
|---|---|---|---|---|
| P/E (forward) | ... | ... | +%.. | |
| EV/EBITDA | ... | ... | | |
| P/B | ... | ... | | |

## Büyüme vs Çarpan
- Forward P/E ... , beklenen büyüme %... → çarpan haklı mı?

## Analist Konsensüs
- Hedef: $... ( N analist ) → cari fiyata %... upside

## Boğa/Ayı Değerleme Tezi
**Ucuz argümanı:** ...
**Pahalı argümanı:** ...

## Varsayımlar
- Çarpanlar gecikmeli/indikatif olabilir. Yatırım tavsiyesi değil.
- DCF yapılmadı (çarpan-tabanlı görece değerleme).
```

## Kurallar
- **Görece değerleme:** Bu skill çarpan-kıyas yapar, tam DCF değil. DCF gerekiyorsa model-builder kullan.
- **Uydurma yok:** Çarpan bulunamazsa boş bırak + "veri yok".
- **Peer dürüst seç:** Cherry-picking yapma; gerçek rakipleri al.
- **Tarih + kaynak** her sayıya.
- **Yatırım tavsiyesi değil.**

## Bağlı dosyalar
- Subagent: `.claude/agents/data-retriever.md`
- Subagent: `.claude/agents/reviewer.md`
- Output: `output/valuation-<ticker>-<YYYYMMDD>.md`
- İleri model: `model-builder` skill'i (senaryo/DCF için)
