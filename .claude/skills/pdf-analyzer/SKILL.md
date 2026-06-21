---
name: pdf-analyzer
description: >
  Read a financial PDF (annual report, 10-K/10-Q, prospectus, bank statement)
  using Claude's native long-context + vision capabilities. Extracts structured
  financials, key risks, management commentary and red flags. No OCR tool needed —
  Claude reads the document directly.
---

# PDF Financial Analyzer

**What Claude does here that other tools cannot:**
Claude's 200 000-token context window reads an *entire* annual report in one pass —
not just a summary or the first 10 pages. Vision capability handles scanned tables,
charts and mixed-format filings without pre-processing.

## Trigger phrases

- "Bu PDF'i analiz et: `<dosya-yolu>`"
- "Analyze this annual report: `<path>`"
- "10-K/yıllık raporu oku ve özetle"
- "Banka ekstresini parse et"

## Phases

### Phase 1 — Load & classify
Read the file with the Read tool (PDF is natively supported).
Determine document type: `annual_report | 10k | 10q | prospectus | bank_statement | other`.
Note language, currency, fiscal year end.

### Phase 2 — Extract financials (structured)
For annual reports / 10-K / 10-Q, extract into this JSON structure:

```json
{
  "company": "",
  "period": "",
  "currency": "",
  "income_statement": {
    "revenue": null,
    "gross_profit": null,
    "ebitda": null,
    "ebit": null,
    "net_income": null,
    "eps": null
  },
  "balance_sheet": {
    "total_assets": null,
    "total_debt": null,
    "cash": null,
    "equity": null,
    "net_debt": null
  },
  "cash_flow": {
    "operating_cf": null,
    "capex": null,
    "free_cash_flow": null,
    "dividends_paid": null
  },
  "ratios": {
    "pe": null,
    "ev_ebitda": null,
    "debt_equity": null,
    "current_ratio": null,
    "roe": null,
    "net_margin_pct": null
  }
}
```

For bank statements, extract: `{period, opening_balance, closing_balance, total_in, total_out, transactions[]}`.

### Phase 3 — Key risks & management commentary
- Identify top 5 risks stated in the document (section: Risk Factors / Riskler)
- Summarize CEO/management outlook in 3 bullet points
- Flag any going-concern, restatement, regulatory or litigation disclosures

### Phase 4 — Red flags
Cross-check for:
- Revenue recognition policy changes (IFRS 15 / ASC 606)
- Debt covenant disclosures
- Qualified / adverse auditor opinion
- Unusual related-party transactions
- Free cash flow ≠ net income divergence > 30%
- Goodwill impairment risk (goodwill > 40% of total assets)

### Phase 5 — Output
Write `output/pdf-<company>-<YYYYMMDD>.md` with:

```
# PDF Analysis: <Company> (<Period>)

## Income Statement (summary)
## Balance Sheet (summary)
## Cash Flow (summary)
## Key Ratios
## Top 5 Risks
## Management Commentary
## Red Flags
## Raw Extracted JSON
```

**Assumptions & limitations:** OCR quality varies on scanned PDFs. All figures as-reported;
no currency conversion unless base_currency is specified. Mark any extracted value with `*`
if confidence is low (table layout complex or partially scanned).
