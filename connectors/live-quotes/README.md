# live-quotes (connector)

Bu sandbox'ta fiyat connector'ı **mock değil**: doğrudan **Claude'un native web araçları**
(WebSearch / WebFetch). `data-retriever` subagent'ı holdinglerin canlı fiyatını bunlarla çeker.

İki fiyat yolu vardır:
- **Python canlı-yenileme yolu** (`pipeline_server.py` → `POST /api/refresh`): Yahoo Finance v8 chart API'sini (`query1.finance.yahoo.com/v8/finance/chart/{TICKER}`) doğrudan, anahtarsız ve sadece stdlib (`urllib`) ile çağırır.
- **Subagent yolu** (`data-retriever`): Claude'un native web araçlarıyla (WebSearch / WebFetch) çeker.

Her ikisi de aynı `quote_source` contract'ını paylaşır.

## quote_source → nasıl çekilir

| quote_source | ne | örnek sorgu | para |
|---|---|---|---|
| `bist` | BIST hisse | "TUPRS hisse fiyatı bugün" | TRY |
| `us_equity` | Nasdaq hisse | "NVDA stock price today" | USD |
| `gold_try` | gram altın | "gram altın fiyatı bugün TL" | TRY |
| `usdtry` | USD/TRY kuru | "dolar kuru bugün TL" | USD→TRY |
| `eurtry` | EUR/TRY kuru | "euro kuru bugün TL" | EUR→TRY |

## Notlar
- Fiyatlar gecikmeli/indikatif olabilir (15 dk gecikme ya da son kapanış).
- Çelişen kaynak olursa (ör. USD/TRY) tek otoriter kaynağa sabitle, **uydurma**.
- Daha "yönetişimli" bir kaynak istenirse `.mcp.json` ile gerçek bir MCP connector bağlanır;
  `quote_source` eşlemesi (contract) aynı kalırsa skill/subagent değişmez.
