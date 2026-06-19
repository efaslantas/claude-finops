---
name: model-builder
description: Portföy veya tek varlık için senaryo & projeksiyon modeli kurar — FX yolu, fiyat senaryoları (bear/base/bull), katkı planı, yıl-sonu/çok-yıllık projeksiyon. "senaryo kur", "projeksiyon yap", "TL zayıflarsa", "çocuk fonu 17 yıl" dendiğinde tetiklenir.
---

# Model Builder — Senaryo & Projeksiyon Modelleyici

Portföy ya da tek varlık için **ileriye dönük senaryo modeli** kur.
Anthropic "Model Builder" template'inin Claude-native karşılığı.

## Ne zaman tetiklenir
- "TL %20 zayıflarsa portföyüm ne olur"
- "yıl sonu projeksiyonu" / "bear/base/bull senaryosu"
- "aylık ₺100K katkıyla 17 yıl sonra çocuk fonu" (data/cocuk-fonu.json, monthly-plan.json)
- "250K'yı şu dağılımla koysam" (data/plan-250k.json)

## Model Tipleri

### A) FX SENARYO (TL zayıflama/güçlenme)
Her varlığın döviz maruziyetini ayrıştır:
- TRY-bazlı (BIST hisse, TL nakit, gram altın TRY): kurdan **dolaylı** etkilenir
  - **Önemli:** Altın USD-bazlı işlem görür → USD/TRY +%X ⇒ altın TRY değeri ~+%X
- USD-bazlı (USD nakit, NVDA, GOOGL): kurdan **doğrudan** +%X
- EUR-bazlı (MBG, EUR nakit): EUR/TRY hareketinden
Çıktı: USD/TRY −%10 / baz / +%10 / +%20 için net-değer + % değişim tablosu.
**Bütünleşik etki:** sadece nakdi değil, altın + USD hisseleri de dahil et.

### B) FİYAT SENARYO (bear/base/bull)
Her hisse için 3 senaryo fiyatı:
- Bear: analist düşük / −%10–15
- Base: analist konsensüs hedefi
- Bull: analist yüksek / momentum
Çıktı: portföy 3 senaryoda ne olur (₺ + %).

### C) KATKI / BİRİKİM PROJEKSİYONU
Düzenli katkı + büyüme varsayımıyla çok-yıllık:
- Aylık katkı (data/monthly-plan.json: ₺80K + ₺20K çocuk fonu)
- Yıllık reel getiri varsayımı (muhafazakâr / baz / iyimser — AÇIKÇA yaz)
- Bileşik büyüme: FV = Σ katkı × (1+r)^kalan_ay
Çıktı: yıl-yıl tablo + nihai değer aralığı (cocuk-fonu: 17 yıl).

## Akış
1. **Girdi al:** hangi model tipi (A/B/C), hangi varlık/portföy, varsayımlar.
2. **Canlı çapa (subagent: data-retriever):** güncel fiyat & FX = senaryonun başlangıç noktası.
3. **Modeli kur:** yukarıdaki formüllerle hesapla. Her varsayımı satıra yaz.
4. **Denetle (subagent: reviewer):** formül tutarlı mı, varsayım gerçekçi mi.
5. **output yaz:** `output/model-<tip>-<YYYYMMDD>.md`

## Çıktı şablonu
```markdown
# <Model tipi> Projeksiyon — <tarih>

## Varsayımlar (AÇIK)
- Başlangıç: net-değer ₺... (canlı, <saat>)
- FX: USD/TRY ..., EUR/TRY ...
- Getiri/büyüme varsayımı: %... (gerekçe)

## Senaryo Tablosu
| Senaryo | Net Değer | Δ | Δ% |
|---|---|---|---|
| Bear / −10% | ... | ... | ... |
| Base | ... | | |
| Bull / +20% | ... | | |

## Yorum
- Hangi varlık senaryoyu domine ediyor (ör: altın FX'e duyarlı)
- Asimetri var mı (yukarı/aşağı farklı mı)

## Sınırlar
- Varsayımlar muhafazakâr/baz/iyimser olarak işaretli. Yatırım tavsiyesi değil.
- Geçmiş getiri gelecek garantisi değildir.
```

## Kurallar
- **Varsayımı sakla:** Her sayının arkasındaki varsayım açık yazılmalı (faiz, büyüme, FX).
- **Altın FX bağı:** USD/TRY senaryosunda altının TRY değerinin de hareket ettiğini unutma.
- **Muhafazakâr default:** Belirsizse düşük getiri varsayımı kullan, iyimseri ayrıca göster.
- **Yatırım tavsiyesi değil.**

## Bağlı dosyalar
- Subagent: `.claude/agents/data-retriever.md`, `.claude/agents/reviewer.md`
- Data: `data/portfolio.json`, `data/monthly-plan.json`, `data/cocuk-fonu.json`, `data/plan-250k.json`
- Output: `output/model-<tip>-<YYYYMMDD>.md`
- UI: `finops-terminal-ultimate.html` FX senaryo kaydırıcısı bu modeli görselleştirir.
