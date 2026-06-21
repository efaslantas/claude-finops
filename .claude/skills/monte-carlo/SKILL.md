---
name: monte-carlo
description: >
  Monte Carlo simulation for portfolio/retirement/accumulation planning.
  Runs 1000 price paths using Geometric Brownian Motion, computes percentile
  outcomes (10th/50th/90th), probability of reaching a target, and expected
  shortfall. No external code runner needed — Claude computes analytically.
---

# Monte Carlo Simulator

## Trigger phrases
- "10 yıllık portföy simülasyonu yap"
- "Emeklilik planlaması — 20 yıl, aylık $1000 katkı"
- "Monte Carlo: ₺1M portföy, 5 yıl hedef"
- "Altın alımını simüle et — 50g/yıl, 10 yıl"
- "What's the probability my portfolio reaches ₺2M in 5 years?"
- "Run Monte Carlo: [asset] [years] [monthly contribution]"

## Input parameters

| Parameter | Description | Default |
|---|---|---|
| `years` | Simulation horizon | required |
| `initial_value` | Starting portfolio value (TRY) | from latest.json |
| `monthly_contribution` | Monthly addition (TRY, can be 0) | 0 |
| `annual_return` | Expected annual return (decimal) | asset-class default |
| `annual_volatility` | Annual volatility (decimal) | asset-class default |
| `target_value` | Target to compute probability for | optional |
| `n_paths` | Number of paths | 1000 |

### Default return/volatility by asset class (use as base, state explicitly)

| Asset class | μ (annual) | σ (annual) |
|---|---|---|
| BIST equities | 18% | 28% |
| US equities (USD) | 10% | 18% |
| Gold (TRY) | 22% | 20% |
| TRY cash | 40% | 5% |
| Crypto (BTC) | 35% | 70% |
| Balanced portfolio | 15% | 15% |

Adjust based on current macro context (high inflation → higher TRY returns but higher vol).

## Phases

### Phase 1 — Parameter setup
Read `output/latest.json` for current portfolio value if not specified.
Determine asset mix and blended μ/σ from portfolio composition.
State all assumptions explicitly.

### Phase 2 — Analytical Monte Carlo
GBM formula for each annual step:
```
S(t+1) = S(t) × exp((μ - σ²/2)×Δt + σ×√Δt×Z)
where Z ~ N(0,1)
```

Since Claude cannot generate true random numbers, use a deterministic
quasi-random sequence (Halton sequence base 2 and 3) to simulate
N=1000 paths across T years. For each path, iterate year by year,
applying the GBM formula and adding monthly contributions compounded
at the annual rate (simplified: monthly_contribution × 12 × ((1+μ)^t - 1)/μ).

### Phase 3 — Percentile outcomes

At each year t, compute across all paths:
- **P10** (pessimistic): 10th percentile
- **P50** (median): 50th percentile  
- **P90** (optimistic): 90th percentile

Present as a table:

```
Year | P10 (₺)  | P50 (₺)  | P90 (₺)
   1 | 780,000  | 920,000  | 1,100,000
   3 | 650,000  | 1,150,000| 1,800,000
   5 | 540,000  | 1,450,000| 2,800,000
  10 | 380,000  | 2,800,000| 8,200,000
```

### Phase 4 — Target probability
If `target_value` specified: P(portfolio > target at year T) = paths above target / N.

### Phase 5 — Risk metrics
- **Expected shortfall (CVaR@5%)**: average of bottom 5% of paths at year T
- **Max drawdown** (median path): largest peak-to-trough decline
- **Break-even year**: first year where P50 > initial_value
- **CAGR (median path)**

### Phase 6 — Scenario comparison
Run 3 versions:
1. Current portfolio (as-is)
2. With rebalance applied (if rebalance_needed from latest.json)
3. With +₺5,000/month contribution

### Phase 7 — Output
Write `output/montecarlo-<YYYYMMDD>.md`:
```
# Monte Carlo Simulation — <Horizon> Year Outlook
## Assumptions
## Year-by-Year Outcomes (P10 / P50 / P90)
## Target Probability: P(≥₺X at year T) = Y%
## Risk Metrics
## Scenario Comparison
## Interpretation Guide
```

**Disclaimer:** All projections are probabilistic estimates based on historical
return/volatility assumptions. Past performance does not guarantee future results.
Not investment advice.
