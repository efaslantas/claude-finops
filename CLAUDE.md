# efa-finops-agentic — FinOps Agent Lab

Bu klasör, Anthropic'in 5 Mayıs 2026'da duyurduğu **finance agent template** yaklaşımını
(skill + connector + subagent) Claude Code'un native yapısı üzerinde prototiplemek için
açılmış bir **sandbox**'tır. Production değil; deneme/öğrenme amaçlı.

## Kompozisyon (3 parça)

| Anthropic kavramı | Buradaki karşılığı | Konum |
|---|---|---|
| **Skill** (talimat + domain bilgisi, markdown) | Agent Skill | `.claude/skills/<ad>/SKILL.md` |
| **Connector** (veri erişimi) | Claude native web araçları (WebSearch/WebFetch) — canlı; opsiyonel MCP | `connectors/live-quotes/` · `.mcp.json` (opsiyonel) |
| **Subagent** (alt görev için ek model) | Claude Code subagent | `.claude/agents/<ad>.md` |

Akış: **intake → connector'dan canlı veri çek → subagent'lara alt görev dağıt → `output/` altına artifact üret.**

## Konvansiyonlar
- Girdi fixture'ları `data/` altında, üretilen artifact'lar `output/` altında.
- Fiyat connector'ı = **Claude native web araçları (WebSearch/WebFetch)**, canlı; daha yönetişimli bir kaynak istenirse `.mcp.json` ile gerçek MCP eklenir (contract aynı kalır).
- Her yeni template = yeni bir `.claude/skills/<template>/SKILL.md` + gerekiyorsa yeni subagent'lar.
- Canlı fiyatlar gecikmeli/indikatif olabilir; varsayımlar açıkça yazılır. Sır/secret commit edilmez.

## Yeni template ekleme (kısa)
1. `.claude/skills/<template-adi>/SKILL.md` oluştur (frontmatter: `name`, `description`).
2. Alt görev gerekiyorsa `.claude/agents/<subagent>.md` ekle.
3. Veri kaynağı için `connectors/live-quotes/README.md`'deki `quote_source → sorgu` eşlemesini genişlet.
4. `data/` altına örnek girdi koy, çalıştır, `output/` çıktısını kontrol et.

## Referans
Anthropic finance agent template'leri: Pitch Builder, Meeting Preparer, Earnings Reviewer,
Model Builder, Market Researcher, Valuation Reviewer, General Ledger Reconciler,
Month-End Closer, Statement Auditor, KYC Screener.
