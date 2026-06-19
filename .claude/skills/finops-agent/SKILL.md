---
name: finops-agent
description: FinOps agent template orkestratörü — intake → canlı veri → subagent'lar → net-değer + senaryo raporu
---

# FinOps Agent — Tam Otomasyon Orkestratörü

Portföyün canlı net-değerini, varlık kırılımını ve FX senaryolarını hesapla. **5 aşama:**

## AŞAMA 1: INTAKE
`data/portfolio.json` oku:
- `owner`, `as_of`, `base_currency` (TRY)
- `holdings[]`: id, name, quantity (ya da quantity_grams / amount), quote_source
- `fx_assumptions`: usdtry, eurtry

**Kontrol:** Quantity null? Hata yok; 0 kabul et ve devam et.

## AŞAMA 2: CONNECTOR — Canlı Fiyat Çek
**Subagent çağrı: data-retriever**

Her holding'in `quote_source`'a göre WebFetch yap:
- `bist` → Bigpara (TUPRS, ASELS, ISCTR)
- `us_equity` → Google Finance (NVDA, TSLA, AMD, SPCX)
- `gold_try` → Bigpara (gram altın)
- `usdtry`, `eurtry` → Investing.com (kur)

**Output:** Structured JSON
```json
{
  "holdings": [
    {"id":"TUPRS","quantity":50,"price":240.80,"currency":"TRY","source":"bigpara","timestamp":"2026-06-16T15:30Z"},
    {"id":"GRAM_ALTIN","quantity_grams":89,"price":6456,"currency":"TRY","source":"bigpara"}
  ],
  "fx_rates": {"usdtry":46.71,"eurtry":53.60},
  "quality": "100% fetched, latency <2min"
}
```

## AŞAMA 3: NORMALIZE & VALIDATE
**Subagent çağrı: data-retriever (devam)**

- FX oranlarını tek kaynaktan al (Investing.com, güncelle)
- Data quality check: hangi kaynaklar yanıt verdi?
- Kur sabit mi, yoksa dinamik mi? (şu an fixture: sabit)

## AŞAMA 4: METHODOLOGY REVIEW
**Subagent çağrı: reviewer**

Denetim:
- Kur varsayımı uygunmu? (hedging açığı)
- Quote_source mix (BIST + Nasdaq + FX + commodity) para birimi tutarlı mı?
- Net-değer formül: ∑(quantity_i × price_i × fx_rate_if_needed) doğru mu?
- Ağırlık hesabı: (value_i / total) × 100% = %

**Output:** Bulguları severity ile raporla (KRITIK / ONEMLI / ONERI / BILGI)

## AŞAMA 5: SYNTHESIS → OUTPUT ÜRET
Markdown dosyaları yaz: `output/<template>-<YYYYMMDD>.md`

### `net-worth-<YYYYMMDD>.md`
- Kalem tablo: Kalem | Miktar | Fiyat | Net (₺) | Ağırlık (%)
- Asset class kırılım: Commodity | Cash/FX | Equity
- Para birimi kırılım: TRY | USD | EUR
- **Gözlemler:** tek-varlık riski, FX açıklığı, hisse bacağı etkisi
- **Kur senaryo:** USD/TRY ±%10, ±%20, ±%30 ise toplam nasıl değişir?

### `portfolio-snapshot-<YYYYMMDD>.md` (opsiyonel)
- Holdings table: Ticker | Piyasa | Para | Canlı Fiyat | Miktar | Net (₺) | Ağırlık
- Dağılım tabloları
- Data quality notu

## Çalışma Örnekleri

### Senaryosu 1: Daily Update (cron)
```
Tetik: Her gün 17:00 UTC
1. portfolio.json oku → portfolio quantity'ler sabit
2. Canlı fiyat çek (WebFetch): BIST, Nasdaq, altın, kur
3. Net-değer hesapla, `output/net-worth-<tarih>.md` yaz
4. HTML dashboard (finops-terminal.html) yeni çıktıyı oku
```

### Senaryo 2: Manual Trigger
```
User: "finops-agent çalıştır"
→ Önce portfolio.json'ı kontrol et
→ Eksik miktar varsa "X kalem eksik" uyar
→ Onay alırsa canlı veri çek + hesapla
→ output/ dosya yaz
```

## Bağlı Dosyalar
- **Skill:** `.claude/skills/finops-agent/SKILL.md` (bu)
- **Subagent:** `.claude/agents/data-retriever.md` (fiyat çekme + normalize)
- **Subagent:** `.claude/agents/reviewer.md` (kontrol)
- **Data:** `data/portfolio.json` (girdi fixture)
- **Output:** `output/*.md` (rapor)
- **Dashboard:** `finops-terminal.html` (FX senaryo + output paneli)
- **Connector mapping:** `connectors/live-quotes/README.md` (quote_source → kaynak)

## Kısıtlamalar & Varsayımlar
- Kur **sabit tutulur** (fx_assumptions'dan); gerçekte TL zayıflarken altın fiyatı da artar
- Fiyatlar **2–5 dakika gecikmeli** olabilir (WebFetch latency)
- **Yatırım tavsiyesi değil**; senaryo = analist hedefleri indirgenmesi
- Eksik veri varsa **uydurma yapma**; "X eksik, manuel giriş gerekli" yaz
