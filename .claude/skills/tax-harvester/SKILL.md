---
name: tax-harvester
description: >
  Tax-loss harvesting analysis: identify unrealized losses in the portfolio that
  can be realized to offset capital gains, estimate tax savings, and suggest
  replacement assets to maintain market exposure. Handles Turkish tax rules
  (Türk vergi mevzuatı) and common international frameworks.
---

# Tax-Loss Harvester

**What Claude does here:** Claude reads the portfolio + cost basis data, applies the
relevant tax rules, and reasons through each holding's harvesting potential —
including wash-sale equivalents and reinvestment suggestions. No calculator
shortcut; each recommendation is reasoned line by line.

## Trigger phrases

- "Vergi hasadı fırsatları var mı?"
- "Tax-loss harvesting analizi yap"
- "Hangi pozisyonları zararla kapatabilirim, vergi avantajı ne?"
- "Capital gains offset opportunities"
- "Year-end tax planning — portföy"

## Tax frameworks supported

| Framework | Key rules applied |
|---|---|
| **Turkey (BIST equities)** | Gains on BIST-listed Turkish equities held > 1 year: exempt. Gains < 1 year: taxed at 10% withholding. Foreign equities: taxed at marginal income tax rate (15–40%). |
| **Turkey (foreign equities)** | USD/EUR-denominated gains translated to TRY at sale date. Losses in foreign equities can offset foreign gains in same year. |
| **Turkey (gold)** | Physical gold gains taxed at marginal rate; gold ETFs follow equity rules. |
| **Turkey (crypto)** | As of 2025: crypto gains taxed at 0.03% transaction tax on gross; no capital gains tax yet. Flag if rules change. |
| **Generic / international** | Long-term vs short-term holding periods, basic offset rules. User specifies jurisdiction. |

Ask the user which framework applies if not evident from the portfolio.

## Phases

### Phase 1 — Cost basis read
Read `data/portfolio.json`. Look for `cost_basis` field per holding:

```json
{ "id": "NVDA", "quantity": 4, "cost_basis_per_unit": 180.00, "cost_basis_ccy": "USD", "purchase_date": "2024-03-15" }
```

If `cost_basis` is missing, ask the user to provide purchase prices. Do not fabricate cost basis.

### Phase 2 — Current value fetch
Read `output/latest.json` for current prices, or trigger a live refresh via `/api/refresh`.

### Phase 3 — Unrealized P&L per holding

For each holding:
```
unrealized_gain_loss = (current_price - cost_basis_per_unit) × quantity
holding_period_days  = today - purchase_date
short_or_long_term   = "short" if days < 365 else "long"
tax_treatment        = <per framework above>
```

### Phase 4 — Harvest candidates

Identify holdings where:
1. `unrealized_gain_loss < 0` (loss position)
2. Harvesting the loss would offset existing gains elsewhere in the portfolio
3. A reasonable replacement asset exists (avoids wash-sale equivalent: same ticker, same ETF, near-identical exposure)

Rank by: `|unrealized_loss| × applicable_tax_rate` (estimated tax saving).

### Phase 5 — Replacement suggestions

For each harvest candidate, suggest a replacement that:
- Maintains similar market exposure
- Is NOT the same security or near-identical ETF (wash-sale risk)
- Is available on the same exchange

| Original | Replacement example |
|---|---|
| NVDA | AMD, SMCI, or a broad semiconductor ETF |
| BIST energy (TUPRS) | Another BIST energy (AYGAZ, PETKM) or BIST100 ETF |
| Gold ETF | Physical gold fund or silver ETF |
| BTC | ETH (different blockchain, different tax lot) |

### Phase 6 — Tax savings estimate

```
harvest_candidate: NVDA
  unrealized loss:     $X × 4 shares = $Y loss
  TRY equivalent:      ₺Z (at current USD/TRY)
  applicable rate:     marginal income tax ~27% (example)
  estimated tax saved: ₺W
  replacement:         AMD (maintain semiconductor exposure)
  re-entry suggestion: after 30 days (wash-sale window)
```

### Phase 7 — Year-end summary

Total estimated tax saving across all harvest candidates.
Flag any gains that should be deferred to next year if close to long-term threshold.
Flag any positions where harvesting would trigger a significant bid-ask spread cost > tax benefit.

### Phase 8 — Output
Write `output/tax-harvest-<YYYY>.md`:

```
# Tax-Loss Harvesting Report <Year>

## Portfolio Overview (realized + unrealized)
## Harvest Candidates (ranked by tax saving)
## Replacement Asset Suggestions
## Estimated Total Tax Saving
## Timing Recommendations
## Assumptions & Disclaimers
```

**Disclaimer:** Tax rules change. Always consult a licensed tax advisor before executing
transactions based on this analysis. This is educational output, not tax advice.
