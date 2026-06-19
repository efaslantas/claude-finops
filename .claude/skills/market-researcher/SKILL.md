---
name: market-researcher
description: Bir hisse / sektör / tema için canlı çok-kaynaklı araştırma — haber + fiyat + katalizör + risk → kısa rapor. "X araştır", "NVDA'ya bak", "savunma sektörü nasıl" dendiğinde tetiklenir.
---

# Market Researcher — Canlı Hisse/Sektör Araştırması

Bir varlık (hisse, emtia, sektör, tema) için **çok-kaynaklı canlı araştırma** yapıp özet rapor üret.
Anthropic "Market Researcher" template'inin Claude-native karşılığı. Connector = WebSearch/WebFetch.

## Ne zaman tetiklenir
- "NVDA araştır" / "ASELS'e bak" / "Tüpraş nasıl gidiyor"
- "savunma sektörü 2026" / "AI çip teması"
- finops-agent net-değer raporunda bir kalem dikkat çekince derinleşmek için

## Akış (4 aşama)

### AŞAMA 1 — KAPSAM
Kullanıcının sorduğu varlığı netleştir:
- Tek hisse mi (NVDA, ASELS), sektör mü (savunma, AI çip), tema mı (TL hedge)?
- Hangi piyasa: BIST / Nasdaq / XETRA?
- Zaman ufku: anlık görünüm mü, 6-12 ay mı?

### AŞAMA 2 — CANLI VERİ (subagent: data-retriever)
Fiyat + temel veriyi çek:
- Güncel fiyat, gün içi değişim (Yahoo Finance v8 API)
- 52-hafta aralığı, hacim (mümkünse)
- Portföydeki kalemse `data/portfolio.json`'daki miktarla değerini bağla

### AŞAMA 3 — HABER & KATALİZÖR (WebSearch)
Son 1-3 ayın gelişmelerini tara:
- Şirkete özel: kazanç, ürün, yönetim, dava, M&A
- Sektörel: regülasyon, talep, rekabet
- Makro: faiz, FX, jeopolitik (özellikle BIST için TL & Türkiye riski)
Her bulguya **tarih + kaynak** ekle. Eski haberi güncel gibi sunma.

### AŞAMA 4 — SENTEZ → output
`output/research-<ticker>-<YYYYMMDD>.md` yaz:

```markdown
# <Ticker> Araştırma — <tarih>

## Özet (3 cümle)
Ne yapıyor, fiyat nerede, ana hikaye ne.

## Canlı Veri
| Metrik | Değer | Kaynak |
|---|---|---|
| Fiyat | ... | yahoo, <saat> |
| Gün içi | ±%... | |
| 52h aralık | ... | |
| Portföy etkisi | (varsa) X adet = ₺... | portfolio.json |

## Katalizörler (pozitif)
- [tarih] ... (kaynak)

## Riskler (negatif)
- [tarih] ... (kaynak)

## Boğa / Ayı Tezi
**Boğa:** ...
**Ayı:** ...

## Varsayımlar & Notlar
- Fiyatlar gecikmeli/indikatif. Yatırım tavsiyesi değil.
- Kaynak çeşitliliği: N farklı kaynak tarandı.
```

## Kurallar
- **Uydurma yok:** Veri yoksa "bulunamadı" yaz. Sayı uydurma.
- **Tarih zorunlu:** Her katalizör/risk için kaynak tarihi. Eski haberi taze gösterme.
- **Çok kaynak:** Tek kaynağa güvenme; en az 2-3 bağımsız kaynak tara.
- **Dengeli:** Hem boğa hem ayı tezi olmalı; tek yönlü rapor üretme.
- **Yatırım tavsiyesi değil** disclaimer'ı her raporda.

## Bağlı dosyalar
- Subagent: `.claude/agents/data-retriever.md` (canlı fiyat)
- Subagent: `.claude/agents/reviewer.md` (opsiyonel: bulgu denetimi)
- Data: `data/portfolio.json` (portföy etkisini bağlamak için)
- Output: `output/research-<ticker>-<YYYYMMDD>.md`
- Derin araştırma gerekiyorsa: `deep-research` skill'i ile birleştirilebilir.
