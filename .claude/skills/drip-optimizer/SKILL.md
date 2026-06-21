---
name: drip-optimizer
description: >
  Dividend Reinvestment Plan (DRIP) optimizer. Projects compound growth from
  reinvesting dividends, compares DRIP vs cash dividend strategies, identifies
  optimal reinvestment timing, and quantifies the impact of dividend growth rate
  on long-term wealth accumulation.
---

# DRIP Optimizer (Dividend Reinvestment)

## Trigger phrases
- "Temettü yeniden yatırımı simüle et"
- "DRIP analizi: NVDA, 10 yıl"
- "Portföyümün temettü bileşik büyümesi ne olur?"
- "Dividend reinvestment plan for [ticker]"
- "Temettü hisse senedi — kaç yılda ikiye katlar?"
- "Compare DRIP vs cash dividend strategy"

## Phases

### Phase 1 — Dividend data fetch
For each equity holding in portfolio, fetch from Yahoo Finance (quoteSummary):
- `dividendYield` — trailing 12-month yield
- `dividendRate` — annual dividend per share
- `exDividendDate` — next ex-div date
- `payoutRatio` — sustainability check
- `5-year average dividend yield` (if available)

Also fetch 5-year dividend growth rate via WebSearch: "[ticker] dividend growth rate CAGR".

Flag holdings with:
- Payout ratio > 80% → sustainability risk
- Dividend yield > 10% → may be a yield trap (price decline)
- Dividend cut history (WebSearch: "[ticker] dividend cut history")

### Phase 2 — DRIP projection model

For each dividend-paying holding, project over user-specified horizon (default 10 years):

**DRIP model:**
```
Shares(t+1) = Shares(t) + Dividend_income(t) / Price(t)
Dividend_income(t) = Shares(t) × DPS(t)
DPS(t) = DPS(0) × (1 + dividend_growth_rate)^t
Price(t) = Price(0) × (1 + price_appreciation_rate)^t
Portfolio_value(t) = Shares(t) × Price(t)
```

Assumptions:
- Dividend growth rate: use 5-year historical CAGR (state explicitly)
- Price appreciation: use analyst consensus or long-term sector average
- Reinvestment: at ex-dividend date price (no fractional share cost)
- Tax: user specifies jurisdiction (Turkey: dividend withholding 10% for BIST; US: 15% QDI for non-US holders)

### Phase 3 — DRIP vs cash comparison

| Year | DRIP shares | DRIP value | Cash shares | Cash value | DRIP advantage |
|---|---|---|---|---|---|
| 1 | | | | | |
| 5 | | | | | |
| 10 | | | | | |
| 20 | | | | | |

DRIP advantage = DRIP value - Cash value (where cash is reinvested at risk-free rate).

### Phase 4 — Tax drag analysis

**Turkey (Türkiye):**
- BIST Turkish stocks: 10% withholding on dividends (reduced by treaty for non-residents)
- Foreign stocks (US/EU): may be subject to withholding at source + TRY income tax
- DRIP tax impact: dividend received → withholding deducted → net reinvested

**Generic (non-Turkey):**
- Qualified dividends: lower rate (state jurisdiction)
- Ordinary dividends: marginal rate
- Net DRIP reinvestment = dividend × (1 - withholding_rate)

Show tax drag on compound growth: gross DRIP vs after-tax DRIP.

### Phase 5 — Optimal reinvestment timing

- **Monthly DRIP** (if broker supports): compounding frequency advantage
- **Quarterly/annual** (typical): model actual payment schedule
- **Opportunistic**: reinvest only when price is below 52-week moving average
  (buy-the-dip DRIP) — show backtested vs simple DRIP over 5 years if data available

### Phase 6 — Portfolio DRIP summary

Aggregate across all dividend-paying holdings:

```
Annual dividend income:    ₺X
After-tax income:          ₺Y
Shares acquired per year:  N
10-year portfolio boost:   +Z% vs no reinvestment
Yield-on-cost (year 10):   A% (vs current yield B%)
```

**Yield-on-cost** = (current DPS × initial share count) / initial investment.
As DPS grows, yield-on-cost grows even without price appreciation.

### Phase 7 — Dividend aristocrat suggestions

If current portfolio has low/no dividend yield, identify 3 alternatives in the same
sector/exchange with strong DRIP profile (WebSearch: "[sector] dividend aristocrats BIST" or "US"):
- Consistent 10+ year dividend growth
- Payout ratio < 60%
- Yield > 2%
- Not a yield trap (positive earnings growth)

### Phase 8 — Output
Write `output/drip-<YYYYMMDD>.md`:
```
# DRIP Optimizer Report

## Portfolio Dividend Summary
## Per-Holding DRIP Projection (10-year)
## DRIP vs Cash Comparison
## Tax Impact Analysis
## Optimal Reinvestment Schedule
## Yield-on-Cost Projections
## Suggested Dividend Growth Additions
## Assumptions & Disclaimers
```

**Disclaimer:** Dividend projections assume consistent payments — companies can
cut dividends at any time. Past dividend growth does not guarantee future growth.
Not investment advice.
