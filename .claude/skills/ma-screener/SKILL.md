---
name: ma-screener
description: >
  M&A due diligence screening. Given a target company, runs a structured
  5-workstream due diligence: financial, strategic, legal/regulatory,
  operational, and synergy analysis. Outputs a DD summary with red flags,
  valuation range, and go/no-go recommendation.
---

# M&A Due Diligence Screener

## Trigger phrases
- "TUPRS satın alma analizi yap"
- "Due diligence: [şirket]"
- "M&A screening for [company]"
- "Acquisition target analysis: [ticker]"
- "Birleşme ön inceleme: [şirket]"

## Phases

### Phase 1 — Target identification
Identify: company name, ticker, exchange, sector, headquarters, ownership structure.
Fetch via WebSearch: recent news, press releases, regulatory filings.

### Phase 2 — Financial DD

**Income statement review:**
- Revenue CAGR (3-year)
- EBITDA margin trend
- Net income consistency
- Earnings quality: cash conversion ratio (CFO/Net Income) > 0.8 = good

**Balance sheet health:**
- Net debt / EBITDA (< 3× = manageable)
- Current ratio (> 1.2 = OK)
- Goodwill / total assets (> 40% = risk)
- Off-balance-sheet liabilities (operating leases, contingent liabilities)

**Cash flow:**
- Free cash flow yield
- CapEx intensity (CapEx / Revenue)
- Working capital cycle

**Valuation range (3 methods):**
1. DCF: use WACC 10-14%, terminal growth 2-3%
2. EV/EBITDA comps: sector median ± 20%
3. Precedent transactions: recent sector M&A multiples (WebSearch)

State implied equity value range and compare to current market cap.

### Phase 3 — Strategic DD

- Market position: market share, competitive moat (cost/switching/network)
- Growth vectors: organic (product/geo expansion) vs inorganic
- Customer concentration: top 10 customers > 50% revenue = risk
- Technology / IP: patents, proprietary systems, digital maturity
- Strategic fit with acquirer (if specified): cost synergies, revenue synergies, time-to-realize

### Phase 4 — Legal & Regulatory DD

Research via WebSearch:
- Pending litigation (securities fraud, antitrust, environmental)
- Regulatory approvals needed (competition authority, sector regulator)
- Sanctions / compliance issues
- Related-party transactions (board, major shareholders)
- Change-of-control provisions (debt covenants, key contracts)

Flag each as: 🔴 Deal-breaker | 🟡 Material risk | 🟢 Manageable

### Phase 5 — Operational DD

- Management quality: tenure, track record, retention risk post-deal
- IT systems: legacy risk, cyber security incidents
- ESG: environmental liabilities, governance score, social controversies
- Supply chain: single-source dependencies, geographic concentration
- HR: headcount trend, key-person dependency, union relations

### Phase 6 — Synergy analysis

**Cost synergies** (typically realizable):
- Overlapping functions (G&A, procurement, logistics): estimate 2-5% of combined revenue
- Facility consolidation
- Technology rationalization

**Revenue synergies** (higher risk, longer horizon):
- Cross-sell / upsell to combined customer base
- Geographic expansion
- Bundled offering premium

State: year-1, year-2, year-3 phased synergy ramp; NPV at 12% discount rate.

### Phase 7 — Red flags summary

Score each workstream 1-5 (5 = clean):

| Workstream | Score | Top risk |
|---|---|---|
| Financial | | |
| Strategic | | |
| Legal/Regulatory | | |
| Operational | | |
| Synergies | | |
| **Overall** | | |

### Phase 8 — Go / No-Go recommendation

Synthesize: valuation vs price, strategic fit, risk profile, synergy NPV.
State: **GO** | **CONDITIONAL GO** (with specific remedies) | **NO-GO** (with reasons).

### Phase 9 — Output
Write `output/ma-<company>-<YYYYMMDD>.md`:
```
# M&A Due Diligence: <Company>
## Executive Summary & Recommendation
## Financial DD
## Strategic DD
## Legal & Regulatory DD
## Operational DD
## Synergy Analysis
## Valuation Range
## Red Flags
## Next Steps (if GO)
```

**Disclaimer:** This is a desktop/public-information DD only. A real transaction
requires legal, accounting, and regulatory expert review. Not investment advice.
