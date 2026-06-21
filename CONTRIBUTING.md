# Katkı Rehberi

Teşekkürler! Bu proje Anthropic'in **finans-agent kompozisyonunu** (skill + connector + subagent)
Claude Code üzerinde prototipleyen bir sandbox'tır. Katkılar memnuniyetle karşılanır.

## Geliştirme ortamı

Sıfır bağımlılık — yalnızca Python 3.8+ ve (AI akışı için) Claude Code gerekir.

```bash
git clone https://github.com/efaslantas/claude-finops.git && cd claude-finops
cp data/portfolio.sample.json data/portfolio.json   # kendi/örnek veriniz
./start.sh                                           # http://localhost:8765
```

## Mimari (kısa)

- `index.html` + `assets/` → terminal UI (statik, build yok)
- `pipeline_server.py` → statik sunucu + `/api/*` köprüsü (yalnızca stdlib)
- `.claude/skills/`, `.claude/agents/`, `.claude/workflows/` → AI agent kompozisyonu
- `data/*.sample.json`, `output/*.sample.json` → paylaşılan örnek veri

Detay: [docs/mimari.excalidraw](docs/mimari.excalidraw) (excalidraw.com'da aç).

## Yeni finans template'i ekleme

1. `.claude/skills/<template-adi>/SKILL.md` oluştur (frontmatter: `name`, `description`).
2. Alt görev gerekiyorsa `.claude/agents/<subagent>.md` ekle.
3. Veri kaynağını `connectors/live-quotes/README.md`'deki eşlemeye ekle.
4. `data/` altına örnek girdi koy, çalıştır, `output/` çıktısını kontrol et.

## Kurallar

- **Kişisel/gerçek finansal veri commit etmeyin.** `data/*.json` ve `output/*.json|*.md`
  `.gitignore` ile korunur; yalnızca `*.sample.json` paylaşılır. PR açmadan önce
  `git status` ile gerçek verinin takip edilmediğini doğrulayın.
- **Sıfır runtime bağımlılığı** ilkesini koruyun (sunucu yalnızca Python stdlib).
- UI değişikliklerinde tek `index.html` + `assets/` yapısını bozmayın.
- Tüm finansal çıktılara **"yatırım tavsiyesi değildir"** notu eklenir.

## PR kontrol listesi

- [ ] `python -m py_compile pipeline_server.py` geçiyor
- [ ] JSON dosyaları geçerli (CI kontrol eder)
- [ ] Gerçek finansal veri yok (`git status` temiz)
- [ ] Değişiklik tarayıcıda çalışıyor (`./start.sh` ile test edildi)
