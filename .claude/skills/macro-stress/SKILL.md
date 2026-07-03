---
name: macro-stress
description: >
  Macro stress-test: simulate how a portfolio reacts to central bank rate changes,
  inflation shocks, currency devaluations or commodity price shifts. Claude builds
  the sensitivity model from the portfolio's own data — no hardcoded assumptions.
  Step-by-step impact reasoning is written into the output so it stays auditable.
---

# Macro Stress Test

**What Claude does here:** Claude reasons step-by-step through each asset's exposure to
a macro shock — correlations, FX pass-through, sector sensitivities — rather than
applying a flat percentage. The reasoning is written into the report itself so
results are auditable (internal thinking is not visible to the reader).

## Trigger phrases

- "USD %20 yükselirse portföyüme etkisi ne?"
- "Fed 100bps artırırsa ne olur?"
- "Enflasyon %60'a çıkarsa portföy analizi"
- "Stress test: BIST %30 düşüş"
- "Run a macro stress test: oil +50%"

## Supported shock types

| Shock | Parameter | Example |
|---|---|---|
| FX devaluation | `ccy`, `change_pct` | `TRY -20%` |
| FX appreciation | `ccy`, `change_pct` | `USD +15%` |
| Central bank rate | `rate_change_bps` | `+100bps` |
| Inflation | `inflation_pct` | `60%` |
| Equity index | `market`, `change_pct` | `BIST -30%` |
| Commodity | `commodity`, `change_pct` | `GOLD +25%` |
| Custom basket | array of above | multiple shocks simultaneously |

## Phases

### Phase 1 — Portfolio read
Read `data/portfolio.json` (or `output/latest.json` if available for current values).
Classify each holding by:
- **FX exposure**: which currency does its price move in?
- **Macro sensitivity**: equity (market beta), commodity (commodity price), cash (rate sensitive), crypto (high vol, low macro correlation)
- **Sector** (if equity): energy, financials, tech, defense, consumer — each has different rate/inflation sensitivity

### Phase 2 — Shock parameterization
Parse the user's stress scenario. Convert natural language to parameters:
- "USD yüzde yirmi yükselir" → `{shock: "fx", ccy: "USD", vs: "TRY", change_pct: +20}`
- "Fed 100bp" → `{shock: "rate", change_bps: +100, market: "US"}`
- "Türkiye enflasyonu yüzde altmış" → `{shock: "inflation", pct: 60, market: "TR"}`

If the user specifies multiple shocks, model them simultaneously (additive first-order).

### Phase 3 — Impact model (step-by-step, written out)

For each holding, reason through:

```
holding: NVDA (equity, USD, tech)
shock: USD/TRY +20%
  → NVDA price in USD: no direct FX effect on USD price
  → NVDA value in TRY: +20% (FX gain — USD asset held in TRY base)
  → Rate sensitivity: tech stocks inverse to rates (+100bps → P/E compression ~-10%)
  → Net effect: +20% FX * (1 - 0.10 rate compression) = +18%
```

Sensitivities to use (when not derivable from data):
- **Equity / BIST**: β ≈ 1.0 vs BIST100 (energy/defense β ≈ 0.8, tech β ≈ 1.2)
- **Gold**: negative real rate correlation; inflation +10% → gold +5–8%
- **USD cash**: direct 1:1 FX gain vs TRY
- **Tech equity (USD)**: rate +100bps → P/E compression ~8–12%
- **Energy equity**: oil +10% → energy stocks +6–8%

State all assumed sensitivities explicitly.

### Phase 4 — Portfolio-level summary

```
Base net-worth:         ₺X
Post-shock net-worth:   ₺Y
Change:                 ₺Z (±N%)

Winners:  [list with individual impact]
Losers:   [list with individual impact]

Largest single-holding impact: X
Most concentrated risk: Y
```

### Phase 5 — Hedging suggestions
For each major negative impact, suggest one practical hedge:
- FX loss on USD assets → TRY-denominated bonds / VIOP USD futures
- Rate-sensitive equities → defensive rotation (utilities, dividend stocks)
- Gold underperformance in disinflation → reduce allocation, rotate to equities

### Phase 6 — Output
Write `output/stress-<scenario>-<YYYYMMDD>.md`:

```
# Macro Stress Test: <Scenario> (<Date>)

## Scenario Parameters
## Holdings Impact Table
## Portfolio Summary (before / after)
## Key Risk Concentrations
## Hedging Suggestions
## Assumptions & Caveats
```

**Disclaimer:** Sensitivities are estimates. Actual market reactions depend on timing,
liquidity and correlation breakdown during crises. Not investment advice.
