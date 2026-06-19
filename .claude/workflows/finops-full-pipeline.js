export const meta = {
  name: 'finops-full-pipeline',
  description: 'Portföy net-değeri tam otomasyonu — intake → canlı veri → AI analiz → output üretim',
  phases: [
    { title: 'Intake',    detail: 'portfolio.json oku, 9 holding doğrula' },
    { title: 'Connector', detail: 'data-retriever: Yahoo Finance WebFetch (8 URL)' },
    { title: 'Review',    detail: 'reviewer: AI metodoloji & risk analizi' },
    { title: 'Synthesis', detail: 'Net-değer hesapla, output/latest.json yaz' },
  ]
}

// ── PHASE 1: INTAKE ────────────────────────────────────────────────────────
phase('Intake')
const intake = await agent(
  `data/portfolio.json dosyasını oku ve validate et:
  - owner, as_of, base_currency bilgilerini al
  - holdings[] array: her kalemin id, quantity/amount, quote_source'unu kontrol et
  - fx_assumptions: usdtry ve eurtry varsayımlarını al
  - Aktif (quantity > 0 veya amount > 0) kalem sayısını say
  - Uyarı varsa belirt

  Beklenen 9 holding: TL_CASH, USD_CASH, EUR_CASH, NVDA, GOOGL, TUPRS, ASELS, MBG, GRAM_ALTIN`,
  {
    label: 'intake-read',
    phase: 'Intake',
    schema: {
      type: 'object',
      required: ['owner', 'as_of', 'active_holdings_count', 'fx_assumptions', 'warnings'],
      properties: {
        owner:                   { type: 'string' },
        as_of:                   { type: 'string' },
        active_holdings_count:   { type: 'number' },
        inactive_holdings_count: { type: 'number' },
        fx_assumptions:          { type: 'object' },
        warnings:                { type: 'array', items: { type: 'string' } }
      }
    }
  }
)

log(`Intake: ${intake.owner} | ${intake.as_of} | ${intake.active_holdings_count} kalem aktif`)
if (intake.warnings && intake.warnings.length) log(`Uyarılar: ${intake.warnings.join(', ')}`)

// ============ PHASE 2: CONNECTOR ============
phase('Connector')
const fetcher = await agent(
  `Sen data-retriever subagent'ısın. Portföy için canlı fiyatları çek.

  ÖNCE data/portfolio.json oku — holdings[] içindeki her kalemin
  id, quote_source ve miktarını (quantity / quantity_grams / amount) ORADAN al.
  (Miktarları buraya hardcode ETME; tek doğru kaynak portfolio.json'dur.)
  Beklenen kalemler: TL_CASH, USD_CASH, EUR_CASH, NVDA, GOOGL, TUPRS, ASELS, MBG, GRAM_ALTIN.

  Yahoo Finance v8 API ile fiyatları çek (WebFetch).
  Her URL: JSON yanıtından chart.result[0].meta.regularMarketPrice al.

  URL listesi:
  1. https://query1.finance.yahoo.com/v8/finance/chart/USDTRY=X?interval=1d&range=1d  → usdtry
  2. https://query1.finance.yahoo.com/v8/finance/chart/EURTRY=X?interval=1d&range=1d  → eurtry
  3. https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d      → xau_usd (USD/troy oz)
  4. https://query1.finance.yahoo.com/v8/finance/chart/TUPRS.IS?interval=1d&range=1d  → tuprs_price (TRY)
  5. https://query1.finance.yahoo.com/v8/finance/chart/ASELS.IS?interval=1d&range=1d  → asels_price (TRY)
  6. https://query1.finance.yahoo.com/v8/finance/chart/NVDA?interval=1d&range=1d      → nvda_price (USD)
  7. https://query1.finance.yahoo.com/v8/finance/chart/GOOGL?interval=1d&range=1d     → googl_price (USD)
  8. https://query1.finance.yahoo.com/v8/finance/chart/MBG.DE?interval=1d&range=1d   → mbg_price (EUR)

  Fallback (API başarısız olursa kullan):
  usdtry=46.31, eurtry=53.85, xau_usd=3300, tuprs=227.50, asels=395.50,
  nvda=207.32, googl=366.11, mbg=46.90

  Hesapla:
  xau_try = xau_usd * usdtry / 31.1035

  value_try her holding için (miktar = portfolio.json'dan):
  - GRAM_ALTIN : quantity_grams * xau_try
  - TL_CASH    : amount (sabit)
  - USD_CASH   : amount * usdtry
  - EUR_CASH   : amount * eurtry
  - NVDA/GOOGL : quantity * price_usd * usdtry
  - TUPRS/ASELS: quantity * price_try
  - MBG        : quantity * price_eur * eurtry

  net_worth_try = sum(tüm value_try)
  net_worth_usd = net_worth_try / usdtry

  Çıktı: holdings_with_prices dizisinde her kalem için:
  {id, price_native, currency_native, price_try, value_try, source, timestamp}`,
  {
    label: 'data-retriever-fetch',
    phase: 'Connector',
    schema: {
      type: 'object',
      required: ['holdings_with_prices', 'fx_rates', 'quality_report', 'net_worth_try', 'net_worth_usd'],
      properties: {
        holdings_with_prices: { type: 'array' },
        fx_rates: { type: 'object', properties: { usdtry: { type: 'number' }, eurtry: { type: 'number' } } },
        quality_report: { type: 'object' },
        net_worth_try: { type: 'number' },
        net_worth_usd: { type: 'number' }
      }
    }
  }
)

log(`Connector: ${fetcher.quality_report.successfully_fetched}/${fetcher.quality_report.total_holdings} fiyat | ₺${Math.round(fetcher.net_worth_try).toLocaleString('tr-TR')}`)

// ── PHASE 3: REVIEW — AI Portföy Analizi ─────────────────────────────────
phase('Review')
const reviewer = await agent(
  `Sen reviewer subagent'ısın. Aşağıdaki portföy verisini metodoloji + gerçek AI analizi ile değerlendir.

  VERİ:
  ${JSON.stringify(fetcher, null, 2)}

  GÖREV — iki katmanlı analiz:

  A) METODOLOJİ & TUTARLILIK:
  - quantity × price_try = value_try doğru mu? Örnekle kontrol et.
  - 9 holding taranmış mı? Eksik varsa flag et.
  - FX kurları tek kaynaktan mı? Tutarlı mı?
  - Zaman damgası tutarlılığı (tüm fiyatlar aynı pencereden mi?)

  B) PORTFÖY ANALİZİ (gerçek AI değerlendirmesi, kural tabanlı değil):
  - Konsantrasyon: Altın ağırlığı ne? Kritik eşiği geçti mi?
  - Döviz riski: USD/TRY seviyesi, TL açığı senaryosu
  - Coğrafi çeşitlilik: BIST/Nasdaq/XETRA dengesi
  - NVDA: AI rallisi momentum ve risk
  - GOOGL: Değerleme ve büyüme görünümü
  - TUPRS: Tüpraş petrol marjı ve Türkiye enerji dinamikleri
  - ASELS: Aselsan savunma ihracat pipeline'ı
  - MBG: Mercedes EV geçiş ve Avrupa ekonomi yavaşlama riski
  - FX senaryo: USD/TRY %+10, %+20 portföyü nasıl etkiler?

  Severity: KRİTİK | ÖNEMLİ | ÖNERİ | BİLGİ (Türkçe, tam bu değerler)
  En az 5, tercihen 7+ bulgu üret. "Yatırım tavsiyesi değil" BİLGİ olarak ekle.`,
  {
    label: 'reviewer-ai-analysis',
    phase: 'Review',
    schema: {
      type: 'object',
      required: ['approved', 'findings', 'summary'],
      properties: {
        approved: { type: 'boolean' },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            required: ['severity', 'issue'],
            properties: {
              severity: { type: 'string' },
              issue:    { type: 'string' }
            }
          }
        },
        summary: { type: 'string' }
      }
    }
  }
)

const critCount = reviewer.findings.filter(f => ['KRİTİK','KRITIK'].includes(f.severity)).length
log(`Review: ${reviewer.findings.length} bulgu (${critCount} kritik) | ${reviewer.approved ? '✅ Onaylı' : '⚠️ Uyarı'}`)

// ── PHASE 4: SYNTHESIS — output/latest.json Yaz ──────────────────────────
phase('Synthesis')

// holdings_with_prices'dan id → holding map
const hp = fetcher.holdings_with_prices || []
const byId = (id) => hp.find(h => h.id === id) || {}
const usdtry = fetcher.fx_rates.usdtry || 46.31
const eurtry = fetcher.fx_rates.eurtry || 53.85
const nwt    = Math.round(fetcher.net_worth_try)
const nwu    = Math.round(fetcher.net_worth_usd)

const vAltin = Math.round(byId('GRAM_ALTIN').value_try || 0)
const vNakit = Math.round((byId('TL_CASH').value_try || 0) + (byId('USD_CASH').value_try || 0) + (byId('EUR_CASH').value_try || 0))
const vHisse = Math.round((byId('NVDA').value_try || 0) + (byId('GOOGL').value_try || 0) + (byId('TUPRS').value_try || 0) + (byId('ASELS').value_try || 0) + (byId('MBG').value_try || 0))
const pct    = (v) => Math.round(v / nwt * 10000) / 100

const latestJson = {
  net_worth_try: nwt,
  net_worth_usd: nwu,
  fx_rates: { usdtry, eurtry },
  asset_class_breakdown: {
    'Emtia': { value: vAltin, percentage: pct(vAltin) },
    'Nakit': { value: vNakit, percentage: pct(vNakit) },
    'Hisse': { value: vHisse, percentage: pct(vHisse) }
  },
  // miktarlar fetcher'dan (data/portfolio.json kaynaklı) — burada hardcode YOK
  holdings_with_prices: hp.map(h => ({
    id: h.id,
    ...(h.quantity_grams != null ? { quantity_grams: h.quantity_grams } : {}),
    ...(h.quantity != null ? { quantity: h.quantity } : {}),
    ...(h.amount != null ? { amount: h.amount } : {}),
    ...(h.price_native != null ? { price: h.price_native } : {}),
    ...(h.price_try != null ? { price_try: h.price_try } : {}),
    value_try: Math.round(h.value_try || 0)
  })),
  quality_report: {
    total_holdings:       9,
    // TL_CASH sabit; geri kalan 8 kalemi fiyat verisi varlığından say
    successfully_fetched: hp.filter(h => h.id !== 'TL_CASH' && ((h.price_try || h.price_native || h.price || h.rate || 0) > 0)).length
  },
  reviewer_findings: reviewer.findings
}

// Dosyayı subagent ile yaz (Write tool gerekiyor)
const writer = await agent(
  `İki dosya yaz:

1. output/latest.json:
   ÖNCE mevcut output/latest.json'u oku (varsa) ve içindeki "net_worth_try" değerini not al — bu "önceki" net-değer.
   SONRA şu JSON'u yaz, "timestamp" alanına şimdiki ISO8601 tarih/saatini, "prev_net_worth_try" alanına da okuduğun önceki net_worth_try'ı (yoksa ${nwt}) ekle:

${JSON.stringify(latestJson, null, 2)}

JSON'a tam olarak şu alanları da ekle (diğer alanların yanına):
"timestamp": "<şimdiki tarih saat ISO8601 formatında>"
"prev_net_worth_try": <eski dosyadaki net_worth_try ya da ${nwt}>

2. output/pipeline-status.json — şunu yaz:
{"state":"done","message":"✓ Tamamlandı — net değer ₺${nwt.toLocaleString('tr-TR')}","progress":100}

Her iki dosya yazıldıktan sonra {"written":true} döndür.`,
  {
    label: 'write-output',
    phase: 'Synthesis',
    schema: {
      type: 'object',
      properties: { written: { type: 'boolean' } }
    }
  }
)

log(`✓ Pipeline tamamlandı | Net: ₺${nwt.toLocaleString('tr-TR')} / $${nwu.toLocaleString('en-US')} | Bulgular: ${reviewer.findings.length}`)

return {
  net_worth_try:   nwt,
  net_worth_usd:   nwu,
  fx_rates:        latestJson.fx_rates,
  finding_count:   reviewer.findings.length,
  critical_count:  critCount,
  review_approved: reviewer.approved,
  output_written:  writer.written,
  status:          reviewer.approved ? '✅ ONAYLANDI' : '⚠️ BULGULAR MEVCUT'
}
