export const meta = {
  name: 'finops-full-pipeline',
  description: 'Portföy net-değeri tam otomasyonu — intake → canlı veri → AI analiz → haber/benchmark → rebalans → output',
  phases: [
    { title: 'Intake',     detail: 'portfolio.json oku, holding doğrula' },
    { title: 'Connector',  detail: 'data-retriever: Yahoo Finance WebFetch' },
    { title: 'Review',     detail: 'reviewer: AI metodoloji & risk analizi' },
    { title: 'Intel',      detail: 'news-sentiment + benchmark-tracker paralel' },
    { title: 'Rebalance',  detail: 'rebalancer: hedef dağılım delta analizi' },
    { title: 'Synthesis',  detail: 'output/latest.json + pipeline-status yaz' },
  ]
}

// ── PHASE 1: INTAKE ────────────────────────────────────────────────────────
phase('Intake')
const intake = await agent(
  `data/portfolio.json dosyasını oku ve validate et:
  - owner, as_of, base_currency bilgilerini al
  - holdings[] array: her kalemin id, quantity/amount, ticker'ını kontrol et
  - fx_assumptions: usdtry ve eurtry varsayımlarını al
  - Aktif (quantity > 0 veya amount > 0) kalem sayısını say
  - Uyarı varsa belirt

  Holdings'i portfolio.json holdings[] dizisinden dinamik türet — her kalemin id, type (commodity/cash/equity/crypto/fund), ticker, ccy ve quantity/amount alanlarını ORADAN al; herhangi bir id/sayı varsayma.`,
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
  id, type, ticker, ccy ve miktarını (quantity / amount) ORADAN al.
  (Miktarları/ticker'ları buraya hardcode ETME; tek doğru kaynak portfolio.json'dur.)
  Holdings'i portfolio.json holdings[] dizisinden dinamik türet — herhangi bir id/sayı varsayma.

  Yahoo Finance v8 API ile fiyatları çek (WebFetch).
  Her URL: JSON yanıtından chart.result[0].meta.regularMarketPrice al.
  Sembol = holding'in kendi ticker'ı (örn. ticker doğrudan Yahoo sembolü olarak kullanılır).

  FX kurları:
  - https://query1.finance.yahoo.com/v8/finance/chart/USDTRY=X?interval=1d&range=1d  → usdtry
  - https://query1.finance.yahoo.com/v8/finance/chart/EURTRY=X?interval=1d&range=1d  → eurtry
  - Genel olarak base TRY ise, ccy≠TRY her kalem için <CCY>TRY=X kurunu çek.

  Fiyatlar:
  - type === 'cash' olmayan her kalem için holding.ticker sembolünü kullanarak fiyatı çek.

  Fallback (FX API başarısız olursa kullan): usdtry=46.31, eurtry=53.85.

  value_try hesabı (miktar/ticker = portfolio.json'dan, type'a göre):
  - type === 'cash'      : amount * fx(ccy)   (ccy===base ise rate=1)
  - type === 'commodity' : quantity * (price / unit_div) * fx(ccy)
                           unit === 'gram' ise unit_div = 31.1035, değilse 1
  - diğer (equity/crypto/fund): quantity * price * fx(ccy)

  net_worth_try = sum(tüm value_try)
  net_worth_usd = net_worth_try / usdtry

  Çıktı: holdings_with_prices dizisinde her kalem için:
  {id, type, price_native, currency_native, price_try, value_try, source, timestamp}`,
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

// ── PHASE 3: REVIEW — AI Portföy Analizi + PHASE 4: INTEL (paralel) ────────
phase('Review')
const reviewer = await agent(
  `Sen reviewer subagent'ısın. Aşağıdaki portföy verisini metodoloji + gerçek AI analizi ile değerlendir.

  VERİ:
  ${JSON.stringify(fetcher, null, 2)}

  GÖREV — iki katmanlı analiz:

  A) METODOLOJİ & TUTARLILIK:
  - quantity × price_try = value_try doğru mu? Örnekle kontrol et.
  - holdings_with_prices'taki tüm kalemler taranmış mı? Eksik varsa flag et.
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

// ── PHASE 4: INTEL — Haber Sentiment + Benchmark (paralel) ───────────────
phase('Intel')
const [newsResult, benchResult] = await parallel([
  () => agent(
    `Sen news-sentiment subagent'ısın.
    data/portfolio.json oku — holdings[] içindeki ticker'lara sahip hisseleri bul (en fazla 5 adet).
    Her biri için WebSearch ile son 7 günlük haberleri ara:
    "WebSearch: <şirket> <ticker> news 2025"
    Her haberE sentiment skoru ata: +2 çok pozitif → 0 nötr → -2 çok negatif.
    Portföy genelinde ortalama sentiment hesapla.
    Çıktı: { tickers_scanned, avg_sentiment, sentiment_label, top_headlines: [{ticker,title,publisher,date,sentiment}] }`,
    { label: 'news-sentiment', phase: 'Intel',
      schema: { type:'object', required:['tickers_scanned','avg_sentiment','sentiment_label','top_headlines'],
        properties: { tickers_scanned:{type:'number'}, avg_sentiment:{type:'number'},
          sentiment_label:{type:'string'}, top_headlines:{type:'array'} } } }
  ),
  () => agent(
    `Sen benchmark-tracker subagent'ısın.
    Aşağıdaki portföy verisiyle endeks karşılaştırması yap.

    NET DEĞER VERİSİ:
    ${JSON.stringify({ net_worth_try: fetcher.net_worth_try, net_worth_usd: fetcher.net_worth_usd }, null, 2)}

    Yahoo Finance v8 API ile son 30 günlük getirileri çek (WebFetch):
    1. BIST100: https://query1.finance.yahoo.com/v8/finance/chart/XU100.IS?interval=1d&range=1mo
    2. S&P500:  https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1mo
    3. Altın:   https://query1.finance.yahoo.com/v8/finance/chart/GC%3DF?interval=1d&range=1mo
    Her biri için chart.result[0].indicators.quote[0].close array'inden ilk ve son değeri al.
    Getiri = (son-ilk)/ilk*100
    Çıktı: { period_days:30, benchmarks:{BIST100:{return_pct},SP500:{return_pct},GOLD:{return_pct}}, summary }`,
    { label: 'benchmark-tracker', phase: 'Intel',
      schema: { type:'object', required:['period_days','benchmarks','summary'],
        properties: { period_days:{type:'number'}, benchmarks:{type:'object'}, summary:{type:'string'} } } }
  )
])
log(`Intel: Sentiment=${newsResult?.sentiment_label||'?'} | BIST100=${benchResult?.benchmarks?.BIST100?.return_pct?.toFixed(1)||'?'}%`)

// ── PHASE 5: REBALANCE ────────────────────────────────────────────────────
phase('Rebalance')
const rebalResult = await agent(
  `Sen rebalancer subagent'ısın.

  MEVCUT PORTFÖY:
  ${JSON.stringify(fetcher.holdings_with_prices || [], null, 2)}

  NET DEĞER: ₺${Math.round(fetcher.net_worth_try).toLocaleString('tr-TR')}

  VARLIK SINIFI DAĞILIMI (mevcut):
  ${JSON.stringify((() => {
    const TYPE_CLASS = { commodity:'Emtia', cash:'Nakit', equity:'Hisse', crypto:'Kripto', fund:'Fon' }
    const classes = {}
    for (const h of (fetcher.holdings_with_prices || [])) {
      const cls = TYPE_CLASS[(h.type||'equity').toLowerCase()] || 'Diğer'
      classes[cls] = (classes[cls]||0) + Math.round(h.value_try||0)
    }
    return Object.fromEntries(Object.entries(classes).map(([k,v]) => [k, { value: v }]))
  })(), null, 2)}

  Hedef dağılım: Emtia %40 · Nakit %20 · Hisse %40 (tolerans ±5%)
  Her sınıf için: mevcut %, hedef %, sapma, gerekli işlem (SAT/AL/DENGE) hesapla.
  En az 3 kalemde kontrol et. Yatırım tavsiyesi olmadığını not düş.`,
  { label: 'rebalancer', phase: 'Rebalance',
    schema: { type:'object', required:['rebalance_needed','deviations','trades','summary'],
      properties: { rebalance_needed:{type:'boolean'}, deviations:{type:'object'},
        trades:{type:'array'}, summary:{type:'string'} } } }
)
log(`Rebalance: ${rebalResult?.rebalance_needed ? 'Dengeleme gerekli — '+rebalResult.trades.length+' işlem' : 'Denge iyi'}`)

// ── PHASE 6: SYNTHESIS — output/latest.json Yaz ──────────────────────────
phase('Synthesis')

// holdings_with_prices (schema-driven — type'a göre kırılım, pipeline_server.py ile uyumlu)
const hp = fetcher.holdings_with_prices || []
const usdtry = fetcher.fx_rates.usdtry || 46.31
const eurtry = fetcher.fx_rates.eurtry || 53.85
const nwt    = Math.round(fetcher.net_worth_try)
const nwu    = Math.round(fetcher.net_worth_usd)
const pct    = (v) => Math.round(v / nwt * 10000) / 100

const TYPE_CLASS = { commodity:'Emtia', cash:'Nakit', equity:'Hisse', crypto:'Kripto', fund:'Fon' }
const classes = {}
for (const h of hp) {
  const cls = TYPE_CLASS[(h.type||'equity').toLowerCase()] || 'Diğer'
  classes[cls] = (classes[cls]||0) + Math.round(h.value_try||0)
}
const asset_class_breakdown = Object.fromEntries(
  Object.entries(classes).map(([k,v]) => [k, { value: v, percentage: pct(v) }]))

const latestJson = {
  net_worth_try: nwt,
  net_worth_usd: nwu,
  fx_rates: { usdtry, eurtry },
  asset_class_breakdown,
  // miktarlar fetcher'dan (data/portfolio.json kaynaklı) — burada hardcode YOK
  holdings_with_prices: hp.map(h => ({
    id: h.id,
    ...(h.type != null ? { type: h.type } : {}),
    ...(h.quantity_grams != null ? { quantity_grams: h.quantity_grams } : {}),
    ...(h.quantity != null ? { quantity: h.quantity } : {}),
    ...(h.amount != null ? { amount: h.amount } : {}),
    ...(h.price_native != null ? { price: h.price_native } : {}),
    ...(h.price_try != null ? { price_try: h.price_try } : {}),
    value_try: Math.round(h.value_try || 0)
  })),
  quality_report: {
    total_holdings:       hp.length,
    // cash sabit (fiyat çekilmez); geri kalan kalemleri fiyat verisi varlığından say
    successfully_fetched: hp.filter(h => (h.type||'equity').toLowerCase() !== 'cash' && ((h.price_try || h.price_native || h.price || h.rate || 0) > 0)).length
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

log(`✓ Pipeline tamamlandı | Net: ₺${nwt.toLocaleString('tr-TR')} / $${nwu.toLocaleString('en-US')} | Bulgular: ${reviewer.findings.length} | Sentiment: ${newsResult?.sentiment_label||'?'}`)

return {
  net_worth_try:    nwt,
  net_worth_usd:    nwu,
  fx_rates:         latestJson.fx_rates,
  finding_count:    reviewer.findings.length,
  critical_count:   critCount,
  review_approved:  reviewer.approved,
  output_written:   writer.written,
  sentiment:        newsResult?.sentiment_label || null,
  rebalance_needed: rebalResult?.rebalance_needed || false,
  status:           reviewer.approved ? '✅ ONAYLANDI' : '⚠️ BULGULAR MEVCUT'
}
