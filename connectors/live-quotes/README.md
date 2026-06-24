# live-quotes (connector)

Bu sandbox'ta fiyat connector'ı **mock değil**: doğrudan **Claude'un native web araçları**
(WebSearch / WebFetch). `data-retriever` subagent'ı holdinglerin canlı fiyatını bunlarla çeker.

İki fiyat yolu vardır:
- **Python canlı-yenileme yolu** (`pipeline_server.py` → `POST /api/refresh`): Yahoo Finance v8 chart API'sini (`query1.finance.yahoo.com/v8/finance/chart/{TICKER}`) doğrudan, anahtarsız ve sadece stdlib (`urllib`) ile çağırır.
- **Subagent yolu** (`data-retriever`): Claude'un native web araçlarıyla (WebSearch / WebFetch) çeker.

Her ikisi de aynı **`type` + `ticker`** contract'ını paylaşır (her holding kendi Yahoo `ticker`'ını ve `type`'ını taşır; bkz. `data/portfolio.sample.json`).

## type + ticker → nasıl çekilir

Yahoo Finance v8 chart API: `https://query1.finance.yahoo.com/v8/finance/chart/{TICKER}?interval=1d&range=1d`
→ `JSON.chart.result[0].meta.regularMarketPrice`

| `type` | ne | ticker örneği | para |
|---|---|---|---|
| `equity` | hisse (BIST `.IS` son ekli) | `TUPRS.IS`, `ASELS.IS`, `NVDA`, `GOOGL` | native ccy (TRY/USD) |
| `commodity` | emtia (ör. altın) | `GC=F` | USD → TRY'ye çevir |
| `crypto` | kripto | `BTC-USD` | USD → TRY'ye çevir |
| `cash` | nakit | — (TRY sabit) / FX: `USDTRY=X` | native ccy |

## Notlar
- Fiyatlar gecikmeli/indikatif olabilir (15 dk gecikme ya da son kapanış).
- Çelişen kaynak olursa (ör. USD/TRY) tek otoriter kaynağa sabitle, **uydurma**.
- Daha "yönetişimli" bir kaynak istenirse `.mcp.json` ile gerçek bir MCP connector bağlanır;
  `type` + `ticker` eşlemesi (contract) aynı kalırsa skill/subagent değişmez.
