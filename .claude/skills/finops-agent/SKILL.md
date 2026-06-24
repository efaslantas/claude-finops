---
name: finops-agent
description: FinOps agent template orkestratörü — intake → canlı veri → subagent'lar → net-değer + senaryo raporu
---

# FinOps Agent — Tam Otomasyon Orkestratörü

Portföyün canlı net-değerini, varlık kırılımını ve FX senaryolarını hesapla. **5 aşama:**

## AŞAMA 1: INTAKE
`data/portfolio.json` oku:
- `owner`, `as_of`, `base_currency` (TRY)
- `holdings[]`: `id`, `name`, `type` (commodity/cash/equity/crypto), `ticker` (Yahoo), `ccy`, `quantity` ya da `amount`
- `fx_assumptions`: usdtry, eurtry

**Kontrol:** Quantity null? Hata yok; 0 kabul et ve devam et.

## AŞAMA 2: CONNECTOR — Canlı Fiyat Çek
**Subagent çağrı: data-retriever**

Her holding'in `type` + `ticker`'ına göre WebFetch yap (Yahoo Finance v8 chart API):
- `equity` → holding'in `ticker`'ı (BIST hisseleri `.IS` son ekli: `TUPRS.IS`, `ASELS.IS`)
- `commodity` → holding'in `ticker`'ı (ör. altın `GC=F`)
- `crypto` → holding'in `ticker`'ı (ör. `BTC-USD`)
- `cash` → TRY ise sabit (fetch yok); değilse FX çevir (ör. `USDTRY=X`)

**Output:** Structured JSON
```json
{
  "holdings": [
    {"id":"TUPRS","type":"equity","ticker":"TUPRS.IS","quantity":100,"price":227.00,"currency":"TRY","source":"yahoo/TUPRS.IS","timestamp":"2026-06-16T15:30Z"},
    {"id":"GOLD_GRAM","type":"commodity","ticker":"GC=F","quantity":50,"price":6500,"currency":"TRY","source":"yahoo/GC=F"},
    {"id":"BTC","type":"crypto","ticker":"BTC-USD","quantity":0.05,"price":4370000,"currency":"TRY","source":"yahoo/BTC-USD"}
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
- Varlık `type` mix'i (equity + cash + commodity + crypto) para birimi tutarlı mı?
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
- **Connector mapping:** `connectors/live-quotes/README.md` (type + ticker → kaynak)

## Kısıtlamalar & Varsayımlar
- Kur **sabit tutulur** (fx_assumptions'dan); gerçekte TL zayıflarken altın fiyatı da artar
- Fiyatlar **2–5 dakika gecikmeli** olabilir (WebFetch latency)
- **Yatırım tavsiyesi değil**; senaryo = analist hedefleri indirgenmesi
- Eksik veri varsa **uydurma yapma**; "X eksik, manuel giriş gerekli" yaz
