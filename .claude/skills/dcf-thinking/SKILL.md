---
name: dcf-thinking
description: >
  Discounted Cash Flow valuation with step-by-step auditable reasoning.
  Claude reasons through revenue projections, EBITDA margins, CapEx, working
  capital, WACC components, and terminal value — writing every assumption,
  its justification, and the sensitivity analysis into the visible output.
  The written reasoning is the deliverable: every assumption is auditable.
---

# DCF Valuation (Auditable Reasoning)

**What Claude does here:** Builds a full DCF model step-by-step, **writing every
assumption and its justification into the response and the output artifact** —
not leaving it in internal thinking, which is never visible to the reader.
Unlike a spreadsheet, each cell is explained — *why* this growth rate, *why* this
margin, *why* this WACC. The written reasoning is as valuable as the number.

## Trigger phrases
- "NVDA DCF değerlemesi yap"
- "Intrinsic value hesapla: [ticker]"
- "DCF modeli kur — [şirket]"
- "Fair value analizi: [ticker]"
- "Build a DCF for [company]"
- "Step-by-step valuation: [ticker]"

## Phases

### Phase 1 — Company profile & data collection
Fetch via WebSearch + WebFetch (Yahoo Finance quoteSummary):
- Current revenue, EBITDA, net income, EPS (last 12 months)
- Revenue growth rate (3-year historical CAGR)
- EBITDA margin (current and 3-year trend)
- CapEx / Revenue ratio
- Net working capital / Revenue ratio
- Current debt, cash, shares outstanding
- Beta (from Yahoo or compute vs benchmark)
- Sector median multiples for sanity check

### Phase 2 — Revenue projection (5 years)

**Reasoning step (write it out):** Reason through growth rate assumptions:
1. Historical growth rate — starting point
2. Analyst consensus (WebSearch: "[company] revenue forecast 2025 2026")
3. Market growth rate — industry TAM expansion
4. Competitive position adjustment — gaining/losing share?
5. Macro headwinds/tailwinds — FX, rates, demand cycle
6. Management guidance — recent earnings call commentary

Output: year 1-5 revenue with explicit rationale for each year's growth rate.

### Phase 3 — EBITDA margin projection

**Reasoning step (write it out):**
- Operating leverage: how does margin behave as revenue grows?
- Investment cycle: is the company in heavy CapEx mode (margin compression) or harvesting?
- Sector comparison: is current margin above/at/below peers?
- One-time items to strip out

Output: year 1-5 EBITDA margin with reasoning.

### Phase 4 — Free cash flow build

For each projection year:
```
Revenue
× EBITDA margin = EBITDA
- D&A (estimate from CapEx trend)
= EBIT
× (1 - tax rate) = NOPAT
+ D&A
- CapEx (% of revenue, declining from heavy investment phase)
- ΔNWC (% of revenue growth × NWC/Revenue ratio)
= Free Cash Flow to Firm (FCFF)
```

Tax rate: use effective rate from financials (typically 20-28% for US, 22% for Turkey).

### Phase 5 — WACC computation

**Reasoning step — each component justified in the output:**

**Cost of equity (CAPM):**
```
Ke = Rf + β × (Rm - Rf) + country_risk_premium
```
- Rf: current 10-year US Treasury (WebFetch or state assumption)
- β: from Yahoo or estimated
- Equity risk premium: 5.5% (US), 6.5% (Turkey/EM)
- Country risk premium: 0% (US), 3-5% (Turkey)

**Cost of debt:**
```
Kd = (Interest expense / Total debt) × (1 - tax rate)
```

**WACC:**
```
WACC = (E/V) × Ke + (D/V) × Kd
```
Where E = market cap, D = net debt, V = E + D.

**Sanity check (state it in the output):** Is this WACC reasonable for this sector?
Compare to sector WACC range. Flag if >15% or <6%.

### Phase 6 — Terminal value

**Gordon Growth Model:**
```
TV = FCF_year5 × (1 + g) / (WACC - g)
```
Terminal growth rate g: typically 2-3% (GDP growth, conservative).

**Exit multiple cross-check:**
```
TV_check = EBITDA_year5 × EV/EBITDA_exit_multiple
```
Exit multiple = current sector median. If TV_GGM vs TV_check differ > 30%, explain why.

### Phase 7 — Enterprise value → equity value

```
Enterprise Value = PV(FCF year 1-5) + PV(Terminal Value)
  [discount each year's FCF at WACC]

Equity Value = EV - Net Debt
Intrinsic value per share = Equity Value / Diluted shares outstanding

Upside/downside vs current price = (Intrinsic - Current) / Current × 100%
```

### Phase 8 — Sensitivity analysis

Build a 3×3 sensitivity table:

|   | WACC - 1% | WACC | WACC + 1% |
|---|---|---|---|
| **g + 0.5%** | | | |
| **g** | | | |
| **g - 0.5%** | | | |

And a revenue growth sensitivity:

|   | Growth - 3% | Base | Growth + 3% |
|---|---|---|---|
| **Margin - 2%** | | | |
| **Base margin** | | | |
| **Margin + 2%** | | | |

### Phase 9 — Bull / base / bear valuation

| Scenario | Key assumption | Intrinsic value | Upside |
|---|---|---|---|
| Bear | Low growth, margin compression, high WACC | | |
| Base | Consensus assumptions | | |
| Bull | High growth, margin expansion, low WACC | | |

### Phase 10 — Output
Write `output/dcf-<ticker>-<YYYYMMDD>.md`:
```
# DCF Valuation: <Company> (<Ticker>)

## Summary
Intrinsic value: $X | Current price: $Y | Upside: Z%
Verdict: UNDERVALUED / FAIRLY VALUED / OVERVALUED

## Key Assumptions (with reasoning)
## 5-Year Projections
## WACC Derivation
## DCF Computation
## Terminal Value
## Sensitivity Analysis
## Bull / Base / Bear
## Comparison to Market Multiples
## Risks to the thesis
```

**Disclaimer:** DCF is highly sensitive to assumptions. Small changes in WACC
or terminal growth rate produce large value swings. Not investment advice.
