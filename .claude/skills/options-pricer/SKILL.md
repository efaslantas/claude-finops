---
name: options-pricer
description: >
  Options pricing and Greeks calculator. Prices European calls and puts using
  Black-Scholes; American options via binomial tree. Computes Delta, Gamma,
  Theta, Vega, Rho. Builds P&L profiles and suggests simple hedging strategies.
---

# Options Pricer

## Trigger phrases
- "NVDA call fiyatı nedir? Strike $220, 30 gün"
- "Put seçeneği fiyatla: AAPL $180 put, 60 günlük"
- "Greekleri hesapla"
- "Delta hedge nasıl yapılır?"
- "Covered call stratejisi oluştur"
- "Price this option: [ticker] [call/put] [strike] [expiry]"

## Input parameters

| Parameter | Description | Default |
|---|---|---|
| `ticker` | Underlying symbol | required |
| `option_type` | `call` or `put` | required |
| `strike` | Strike price | required |
| `days_to_expiry` | Days until expiration | required |
| `implied_vol` | IV as decimal (0.30 = 30%) | fetch from Yahoo or ask user |
| `risk_free_rate` | Annual rate | 0.045 (4.5%) |
| `dividend_yield` | Annual yield as decimal | 0.0 |

## Phases

### Phase 1 — Fetch spot price
Fetch current price of `ticker` via WebFetch (Yahoo Finance v8 chart API).
If `implied_vol` not provided, fetch from Yahoo Finance option chain or use
historical volatility (30-day realized vol from price history).

### Phase 2 — Black-Scholes pricing (European)

```
d1 = [ln(S/K) + (r - q + σ²/2) × T] / (σ × √T)
d2 = d1 - σ × √T

Call = S × e^(-q×T) × N(d1) - K × e^(-r×T) × N(d2)
Put  = K × e^(-r×T) × N(-d2) - S × e^(-q×T) × N(-d1)
```

Where:
- S = spot price, K = strike, T = days/365
- r = risk-free rate, q = dividend yield, σ = implied vol
- N(x) = standard normal CDF

Use 6-term polynomial approximation for N(x):
```
N(x) ≈ 1 - n(x)(a1×k + a2×k² + a3×k³)  for x ≥ 0, k = 1/(1+0.33267×x)
a1=0.4361836, a2=-0.1201676, a3=0.9372980
```

### Phase 3 — Greeks

```
Delta (Δ):  Call = e^(-qT) × N(d1)     Put = -e^(-qT) × N(-d1)
Gamma (Γ):  e^(-qT) × n(d1) / (S × σ × √T)
Theta (Θ):  [per day] -(S × n(d1) × σ × e^(-qT))/(2√T) - r×K×e^(-rT)×N(±d2)
Vega  (V):  S × √T × n(d1) × e^(-qT)  [per 1% vol change: divide by 100]
Rho   (ρ):  K × T × e^(-rT) × N(±d2)  [per 1% rate change: divide by 100]
```

### Phase 4 — American options (binomial, if requested)
For American options (early exercise possible), use Cox-Ross-Rubinstein binomial tree
with N=100 steps:
```
u = e^(σ√(T/N)),  d = 1/u,  p = (e^((r-q)T/N) - d)/(u-d)
```
At each node, compare hold value vs early exercise value; take the max.

### Phase 5 — P&L profile at expiry

Generate a table of payoffs at expiry for S ranging from 0.7×K to 1.3×K (11 points):

```
Strike: $220 | Type: CALL | Premium: $8.45
S at expiry | Payoff | Net P&L
$180        |  $0    | -$8.45
$200        |  $0    | -$8.45
$210        |  $0    | -$8.45
$220        |  $0    | -$8.45
$230        | $10    | +$1.55
$240        | $20    | +$11.55
$250        | $30    | +$21.55
```

Break-even: Strike + Premium (call) or Strike - Premium (put).

### Phase 6 — Strategy suggestion

Based on portfolio holdings, suggest a simple strategy:
- **Covered call**: long 100 shares → sell 1 OTM call → income + downside buffer
- **Protective put**: long shares → buy ATM put → portfolio insurance
- **Cash-secured put**: sell OTM put → buy shares at discount or keep premium
- **Straddle**: buy call + put at same strike → play on volatility event

### Phase 7 — Output

Write `output/options-<ticker>-<YYYYMMDD>.md`:
```
# Options Analysis: <Ticker> <Type> $<Strike> (<DTE>d)

## Pricing Summary
| Metric | Value |
|---|---|
| Spot price | |
| Implied vol | |
| Black-Scholes price | |
| Intrinsic value | |
| Time value | |

## Greeks
| Greek | Value | Interpretation |
|---|---|---|
| Delta | | |
| Gamma | | |
| Theta | per day | |
| Vega | per 1% IV | |
| Rho | per 1% rate | |

## P&L at Expiry
## Break-even
## Strategy Suggestion
## Assumptions
```

**Disclaimer:** Model prices are theoretical. Actual market prices differ due to
supply/demand, early exercise premium, and bid-ask spread. Not investment advice.
