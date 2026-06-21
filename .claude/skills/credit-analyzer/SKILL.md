---
name: credit-analyzer
description: >
  Bond and credit analysis. Prices bonds, computes yield to maturity, duration,
  convexity, and spread-to-benchmark. Analyzes credit quality, covenant risk,
  and refinancing risk. Compares corporate bonds vs sovereign alternatives.
  Works for Turkish Eurobonds, BIST bonds, US Treasuries, and corporate bonds.
---

# Credit Analyzer

## Trigger phrases
- "Bu tahvilin YTM'si nedir?"
- "Bond pricing: [issuer] [coupon]% [maturity]"
- "Duration ve convexity hesapla"
- "Hazine bonosu vs kurumsal tahvil karşılaştır"
- "Türkiye Eurobond analizi"
- "Credit spread nedir? [şirket] tahvili"
- "Analyze bond: [ISIN or description]"

## Input parameters

| Parameter | Description |
|---|---|
| `issuer` | Company or sovereign name |
| `coupon_rate` | Annual coupon rate (%) |
| `face_value` | Par value (default: 1000) |
| `maturity_date` | Maturity date or years to maturity |
| `frequency` | Coupon frequency: annual/semi-annual/quarterly |
| `current_price` | Market price (% of par, e.g. 98.5) |
| `settlement_date` | T+2 from today (default) |

## Phases

### Phase 1 — Bond identification & data
If ISIN or description provided, search via WebSearch for current price, coupon, maturity.
For Turkish bonds: fetch from WebSearch (e.g. "Turkey 2028 Eurobond price") or
BIST bond market data.
For US Treasuries: use current yield curve (fetch via WebSearch: "US Treasury yield today").

### Phase 2 — Yield to Maturity (YTM)

Newton-Raphson iteration to find YTM (r) where:
```
Price = Σ [Coupon / (1+r)^t] + [FaceValue / (1+r)^T]
```

For semi-annual coupons: coupon/2, r/2, double periods.

Convergence: start with r = coupon/price; iterate 10 times.

Also compute:
- **Yield to Call** (if callable): substitute call date and call price
- **Current yield**: annual coupon / current price
- **Discount/premium**: (Price - Par) / Par × 100%

### Phase 3 — Duration & Convexity

**Macaulay Duration:**
```
D = Σ [t × PV(CFt)] / Price
```

**Modified Duration** (price sensitivity to rate change):
```
MD = Macaulay Duration / (1 + YTM/frequency)
Price change ≈ -MD × ΔYTM × Price
```

**Convexity** (second-order correction):
```
Convex = Σ [t(t+1) × PV(CFt)] / [Price × (1+r)²]
```

**Combined price change for ΔYTM:**
```
ΔP/P ≈ -MD × ΔYTM + 0.5 × Convexity × ΔYTM²
```

Present in table:
| Rate change | Duration effect | Convexity correction | Net price change |
|---|---|---|---|
| -200bps | | | |
| -100bps | | | |
| +100bps | | | |
| +200bps | | | |

### Phase 4 — Credit spread analysis

**Spread to benchmark:**
```
Credit spread = YTM(bond) - YTM(benchmark)
```
Benchmark: same-maturity government bond (Turkey GB for Turkish issuers, US Treasury for USD bonds).

Fetch benchmark yield via WebSearch.

**Spread interpretation:**
- < 50bps: investment grade (AAA-AA)
- 50-150bps: investment grade (A-BBB)
- 150-400bps: high yield (BB)
- > 400bps: distressed / CCC territory

**Z-spread** (vs swap curve): if swap rates available, compute parallel shift to discount curve.

### Phase 5 — Credit quality assessment

Research via WebSearch:
- Credit rating: Moody's / S&P / Fitch (or implied from spread)
- Rating trend: stable / positive / negative outlook
- Key credit metrics:
  - Net debt / EBITDA (< 3× = investment grade)
  - Interest coverage (EBITDA / Interest > 3× = safe)
  - Free cash flow / Total debt > 10% = positive
- Recent rating actions or watch-list placement

**Covenant check** (if prospectus available):
- Change of control put
- Debt incurrence covenant
- Dividend restriction
- Cross-default provision

### Phase 6 — Refinancing risk

- Maturity wall: what debt matures in next 2-3 years?
- Available credit facilities / revolving credit
- Market access: issuer has issued recently? Spread trend tightening or widening?
- For sovereigns: IMF program, FX reserves, current account deficit

### Phase 7 — Comparison vs alternatives

Build comparison table for similar maturity:

| Instrument | Yield | Duration | Credit rating | Liquidity |
|---|---|---|---|---|
| This bond | | | | |
| Govt benchmark | | | | |
| Sector peer bond | | | | |
| TRY deposit (if TRY bond) | | | | |

**Breakeven analysis:** at what spread widening does the government bond outperform?
```
Breakeven = current spread - coupon advantage / modified duration
```

### Phase 8 — Output
Write `output/credit-<issuer>-<YYYYMMDD>.md`:
```
# Credit Analysis: <Issuer> <Coupon>% <Maturity>

## Bond Summary
## Pricing & Yield Metrics
## Duration & Rate Sensitivity
## Credit Spread Analysis
## Credit Quality Assessment
## Covenant Highlights
## Refinancing Risk
## Comparison vs Alternatives
## Recommendation
## Assumptions
```

**Disclaimer:** Bond prices fluctuate. Credit ratings can change. Illiquid bonds
may have wide bid-ask spreads. Not investment advice.
