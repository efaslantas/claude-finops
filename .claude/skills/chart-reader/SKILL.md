---
name: chart-reader
description: >
  Chart vision analysis. Given a screenshot or image of a financial chart,
  Claude reads it using native vision capabilities — no OCR, no pre-processing.
  Identifies trend, key levels (support/resistance), candlestick patterns,
  technical indicators visible in the chart, and provides a bias (bullish/bearish/neutral).
---

# Chart Reader (Vision)

**What Claude does here:** Reads financial chart images natively using vision.
No external OCR or image processing needed — hand Claude a screenshot and it
reasons about price action, patterns, and structure directly.

## Trigger phrases
- "Bu grafiği analiz et" + [image/screenshot]
- "Chart'a bak: trend ne?"
- "Bu mum formasyonu ne anlama geliyor?"
- "Support/resistance seviyeleri neler?"
- "Analyze this chart" + [image]
- "Technical analysis of this screenshot"

## How to provide the chart
- Paste a screenshot directly in the Claude conversation
- Provide a file path: `Read` the image file
- Share a URL to a chart image (WebFetch)

Supported: PNG, JPG, WebP, SVG. Works with TradingView, Yahoo Finance charts,
broker screenshots, or hand-drawn sketches.

## Analysis framework

### Phase 1 — Chart identification
- Asset / ticker (if visible on chart)
- Timeframe: 1m / 5m / 15m / 1h / 4h / 1D / 1W / 1M
- Chart type: candlestick / OHLC bar / line / Heikin-Ashi / Renko
- Date range visible
- Price scale (left/right), axis values

### Phase 2 — Trend analysis
**Primary trend** (highest visible timeframe):
- Direction: uptrend / downtrend / sideways
- Strength: strong / moderate / weak
- Evidence: higher highs + higher lows (up) | lower highs + lower lows (down)

**Moving averages** (if visible):
- Identify MA periods if labeled (20, 50, 100, 200)
- Price above/below MAs
- MA crossovers (golden cross / death cross)
- MA slope direction

**Trendlines:**
- Rising channel, falling channel, horizontal range
- Break of trendline → trend reversal signal

### Phase 3 — Key price levels

**Support levels** (price floor, where buyers stepped in):
- Previous lows that held
- Round numbers (psychological support)
- Gap fills
- State as: Strong / Moderate / Weak (how many times tested)

**Resistance levels** (price ceiling, where sellers appeared):
- Previous highs
- Previous support turned resistance (flip zones)
- Round numbers

**Current price position:**
- Distance to nearest support: X%
- Distance to nearest resistance: X%
- Risk/reward if long from current: R:R = support_distance / resistance_distance

### Phase 4 — Candlestick patterns (last 5-10 candles)

Common patterns to identify:
| Bullish | Bearish | Reversal |
|---|---|---|
| Hammer | Shooting star | Doji |
| Bullish engulfing | Bearish engulfing | Evening/Morning star |
| Dragonfly doji | Gravestone doji | Harami |
| Morning star | Three black crows | Spinning top |
| Bullish marubozu | Bearish marubozu | Inside bar |

State: pattern name, location (top/bottom/middle of range), reliability (high/medium/low).

### Phase 5 — Technical indicators (if visible)

**Volume:**
- Above/below average
- Volume on up-days vs down-days (accumulation/distribution)
- Volume spike on breakout = confirmation; low volume = weak signal

**RSI** (if visible):
- Level: overbought (>70) / neutral / oversold (<30)
- Divergence: price making new high but RSI lower = bearish divergence

**MACD** (if visible):
- Signal line cross direction
- Histogram expanding/contracting
- Zero-line position

**Bollinger Bands** (if visible):
- Price at upper/lower band = extended
- Band squeeze = low volatility, breakout incoming

### Phase 6 — Chart patterns (broader structure)

Identify if visible:
- **Continuation**: flag, pennant, wedge, cup & handle, triangle
- **Reversal**: head & shoulders, double top/bottom, triple top/bottom
- **Neutral**: rectangle, symmetrical triangle

For each pattern: target price (if pattern completes) = breakout level ± pattern height.

### Phase 7 — Synthesis & bias

```
BIAS: BULLISH / BEARISH / NEUTRAL
Confidence: HIGH / MEDIUM / LOW

Key observations:
1.
2.
3.

Watch levels:
- Break above [$X] → bullish target [$Y]
- Break below [$Z] → bearish target [$W]

Suggested action: [hold / wait for pullback / avoid until trend confirmed]
```

**Disclaimer:** Technical analysis is probabilistic, not predictive. Pattern
recognition does not guarantee outcomes. Not investment advice.
