---
name: macro-calendar
description: >
  Macro event calendar and portfolio impact pre-brief. Fetches upcoming central bank
  decisions, inflation releases, GDP data, earnings seasons, and geopolitical events.
  For each event, estimates the likely portfolio impact — which holdings are most
  exposed, what scenarios are priced in, and what to watch for.
---

# Macro Calendar

## Trigger phrases
- "Bu hafta hangi makro olaylar var?"
- "Fed toplantısı portföyümü nasıl etkiler?"
- "TCMB kararı öncesi portföy analizi"
- "Upcoming macro events this month"
- "What macro events should I watch for my portfolio?"
- "ENFLASYON verisi ne zaman açıklanıyor?"

## Phases

### Phase 1 — Event calendar fetch

WebSearch for the next 4 weeks:

**Central bank meetings:**
- TCMB (Türkiye Cumhuriyet Merkez Bankası) — next rate decision date + consensus
- Federal Reserve (FOMC) — next meeting date + current fed funds futures pricing
- ECB — next meeting + market expectations
- Bank of England, Bank of Japan (if portfolio has EUR/GBP/JPY exposure)

**Macro data releases:**
- Turkey: CPI (TÜFE), PPI (ÜFE), GDP, current account, unemployment
- US: CPI, PPI, PCE, non-farm payrolls, GDP, retail sales, ISM
- Eurozone: CPI flash, GDP, PMI
- China: PMI, industrial production, retail sales (if EM exposure)

**Earnings season:**
- For each equity holding: next earnings date (WebSearch: "[ticker] earnings date")
- Analyst EPS consensus (WebSearch: "[ticker] earnings estimate")

**Geopolitical / regulatory:**
- Upcoming elections (Turkey, US, EU member states)
- Sanctions announcements
- Trade policy events
- BIST-specific: BIST index rebalancing dates, dividend season (April-June in Turkey)

### Phase 2 — Event classification

For each event, classify:

| Event | Date | Market sensitivity | Portfolio exposure | Surprise potential |
|---|---|---|---|---|
| FOMC rate decision | | HIGH | USD assets, NVDA, GOOGL | Medium |
| Turkey CPI | | HIGH | TRY assets, BIST | Medium |
| NVDA earnings | | HIGH | NVDA (direct) | High |
| ... | | | | |

**Sensitivity tiers:**
- 🔴 HIGH: event directly reprices holdings (earnings, rate decisions)
- 🟡 MEDIUM: indirect macro impact (CPI, GDP on sentiment)
- 🟢 LOW: background noise (PMI, minor data)

### Phase 3 — Per-holding event exposure

Map each holding to its top-3 macro sensitivities:

| Holding | Top event 1 | Impact | Top event 2 | Impact |
|---|---|---|---|---|
| NVDA | FOMC (+100bps = -8% est.) | Fed rate change | US CPI | Tech sentiment |
| TUPRS | TCMB decision | TRY/USD rate | Brent oil | Input cost |
| GRAM ALTIN | Real rates | Inversely correlated | USD index | Inverse |
| USD CASH | TCMB | TRY devaluation | FOMC | USD strength |

### Phase 4 — Scenario analysis per event

For the 2-3 highest-impact upcoming events, build a mini scenario table:

**Example: TCMB rate decision**
| Scenario | Probability | TRY impact | BIST impact | Portfolio impact |
|---|---|---|---|---|
| Hold (expected) | 55% | Flat | Flat | ~0% |
| Cut 25bps (dovish surprise) | 30% | -2% | +2% | +0.5% (net) |
| Hike 25bps (hawkish surprise) | 15% | +3% | -3% | -0.8% (net) |

Derive probabilities from: WebSearch (analyst surveys, market pricing) + recent TCMB rhetoric.

**Example: NVDA earnings**
| Scenario | Revenue vs est | EPS vs est | Expected reaction |
|---|---|---|---|
| Beat & raise | +5% | +10% | +8-12% |
| In-line | 0% | 0% | ±2% |
| Miss | -5% | -8% | -10-15% |

### Phase 5 — Risk calendar heat map (text-based)

```
Week 1 (Jun 23-27):
  Mon:  🟢 EU PMI Flash
  Tue:  🔴 US Consumer Confidence
  Wed:  🔴 FOMC minutes
  Thu:  🟡 Turkey trade balance
  Fri:  🔴 US PCE inflation ← MOST IMPORTANT THIS WEEK

Week 2 (Jun 30 - Jul 4):
  Mon:  🟡 Turkey CPI (TÜFE)
  Tue:  🔴 NVDA earnings (after close)
  ...
```

### Phase 6 — Pre-event positioning checklist

For each HIGH-sensitivity event, suggest:
1. **What to watch:** the exact number/language that moves markets
2. **What's priced in:** current market expectation (consensus)
3. **Tail risk:** the scenario that's NOT priced in
4. **Portfolio action:** hedge / reduce / hold / add on weakness
5. **Post-event plan:** what price level confirms the move is real

### Phase 7 — Output
Write `output/macro-calendar-<YYYYMMDD>.md`:
```
# Macro Calendar — Week of <date>

## High-Impact Events (next 4 weeks)
## Per-Holding Event Exposure
## Key Event Scenarios
## Risk Calendar Heat Map
## Pre-Event Positioning Checklist
## Watch-List: Key Levels to Monitor
```

Update this report weekly — stale macro calendars are worse than none.

**Disclaimer:** Market reactions to macro events are unpredictable. Consensus
expectations are already priced in; only surprises move markets significantly.
Not investment advice.
