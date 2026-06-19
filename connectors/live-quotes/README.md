# live-quotes (connector)

Bu sandbox'ta fiyat connector'ı **mock değil**: doğrudan **Claude'un native web araçları**
(WebSearch / WebFetch). `data-retriever` subagent'ı holdinglerin canlı fiyatını bunlarla çeker.

## quote_source → nasıl çekilir

| quote_source | ne | örnek sorgu | para |
|---|---|---|---|
| `bist` | BIST hisse | "TUPRS hisse fiyatı bugün" | TRY |
| `us_equity` | Nasdaq hisse | "NVDA stock price today" | USD |
| `gold_try` | gram altın | "gram altın fiyatı bugün TL" | TRY |
| `usdtry` | USD/TRY kuru | "dolar kuru bugün TL" | USD→TRY |

## Notlar
- Fiyatlar gecikmeli/indikatif olabilir (15 dk gecikme ya da son kapanış).
- Çelişen kaynak olursa (ör. USD/TRY) tek otoriter kaynağa sabitle, **uydurma**.
- Daha "yönetişimli" bir kaynak istenirse `.mcp.json` ile gerçek bir MCP connector bağlanır;
  `quote_source` eşlemesi (contract) aynı kalırsa skill/subagent değişmez.
