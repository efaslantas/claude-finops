#!/usr/bin/env python3
"""
FinOps Terminal — statik dosya sunucusu + JSON köprüsü (yalnızca Python stdlib).

Uçlar:
  GET  /                  → index.html (terminal UI)
  GET  /api/latest        → output/latest.json (net-değer + bulgular)
  GET  /api/status        → pipeline durumu
  GET  /api/history       → output/history.json (günlük net-değer + token)
  GET  /api/reports       → output/*.md skill çıktıları listesi
  POST /api/refresh       → canlı fiyat çek + net-değer hesapla (LLM YOK, sadece HTTP)
  POST /api/run           → AI analiz SİNYALİ yazar (claude'u ÇALIŞTIRMAZ; RCE yok)
  POST /api/record-run    → tam pipeline çalıştırmasını + token'ı kaydeder

Güvenlik: varsayılan bind 127.0.0.1 (FINOPS_BIND ile değişir). Server hiçbir zaman
claude/alt süreç çalıştırmaz; AI işini açık Claude Code session'ı (watcher) yapar.
"""
import json, re, logging, threading, os, time, urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs, quote, unquote

logging.basicConfig(level=logging.WARNING, format="%(asctime)s %(levelname)s %(message)s")

STATUS = {"state": "idle", "message": "Hazır", "progress": 0}
LOCK = threading.Lock()

TICKER_RE = re.compile(r'^[A-Z0-9.\-=^]{1,20}$', re.IGNORECASE)
MAX_BODY = 1 * 1024 * 1024  # 1 MB
REFRESH_COOLDOWN = 30        # saniye — Yahoo rate limit koruması
ALLOWED_STATUS_KEYS = {"state", "message", "progress"}
VALID_HOLDING_TYPES = {"equity", "cash", "commodity", "crypto", "fund"}
_last_refresh = 0


def safe_ticker(tk):
    """Ticker'ı doğrula — sadece geçerli Yahoo Finance karakter kümesine izin ver."""
    if not tk or not TICKER_RE.match(str(tk)):
        return None
    return str(tk)

GRAM_PER_OZ = 31.1035


def yf_quote(ticker):
    """Yahoo Finance v8 chart API'den fiyat + önceki kapanış. (price, prev_close) ya da (None, None)."""
    if not safe_ticker(ticker):
        return None, None
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=2d"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            d = json.load(r)
        meta = d["chart"]["result"][0]["meta"]
        price = meta.get("regularMarketPrice")
        prev = meta.get("chartPreviousClose") or meta.get("previousClose")
        return price, prev
    except Exception:
        return None, None


def live_refresh():
    """
    Canlı fiyat çek + net-değer hesapla → output/latest.json güncelle.
    LLM gerektirmez (sadece HTTP). reviewer_findings son Claude çalıştırmasından korunur.
    """
    pf = "data/portfolio.json" if os.path.exists("data/portfolio.json") else "data/portfolio.sample.json"
    with open(pf, encoding="utf-8") as f:
        port = json.load(f)
    holdings = port.get("holdings", [])

    # mevcut latest.json (prev net-değer + AI bulgularını koru)
    old = {}
    try:
        with open("output/latest.json", encoding="utf-8") as f:
            old = json.load(f)
    except Exception:
        pass

    base = (port.get("base_currency") or "TRY").upper()

    # FX: ihtiyaç duyulan kurları bir kez çek (ccy → base). base==ccy ise 1.
    _fx_cache = {base: 1.0}
    def fx(ccy):
        ccy = (ccy or base).upper()
        if ccy in _fx_cache:
            return _fx_cache[ccy]
        r, _ = yf_quote(f"{ccy}{base}=X")
        _fx_cache[ccy] = r or 1.0
        return _fx_cache[ccy]

    TYPE_CLASS = {"commodity": "Emtia", "cash": "Nakit", "equity": "Hisse", "crypto": "Kripto", "fund": "Fon"}

    out, fetched, need = [], 0, 0
    for h in holdings:
        hid = h.get("id"); typ = (h.get("type") or "equity").lower()
        ccy = (h.get("ccy") or base).upper()
        row = {"id": hid, "name": h.get("name", hid), "type": typ, "ccy": ccy}
        val = 0
        if typ == "cash":
            amt = h.get("amount", 0); rate = fx(ccy)
            row.update(amount=amt, rate=round(rate, 4)); val = amt * rate
        else:
            need += 1
            q = h.get("quantity", 0); tk = h.get("ticker", "")
            p, _ = yf_quote(tk) if tk else (None, None)
            if p: fetched += 1
            unit_div = GRAM_PER_OZ if (typ == "commodity" and (h.get("unit") == "gram")) else 1.0
            per_unit = (p / unit_div) if p else None
            row.update(quantity=q, ticker=tk, price=p,
                       price_try=round(per_unit * fx(ccy), 4) if per_unit else None)
            val = (q * per_unit * fx(ccy)) if per_unit else 0
        row["value_try"] = round(val)
        out.append(row)

    nwt = sum(r.get("value_try", 0) for r in out)
    usdtry = fx("USD"); nwu = round(nwt / usdtry) if usdtry else 0
    pc = lambda v: round(v / nwt * 10000) / 100 if nwt else 0

    # varlık sınıfı kırılımı (türe göre, dinamik)
    classes = {}
    for h, r in zip(holdings, out):
        cls = TYPE_CLASS.get((h.get("type") or "equity").lower(), "Diğer")
        classes[cls] = classes.get(cls, 0) + r["value_try"]
    breakdown = {k: {"value": v, "percentage": pc(v)} for k, v in classes.items()}

    latest = {
        "timestamp": datetime.now().astimezone().isoformat(),
        "base_currency": base,
        "net_worth_try": nwt,
        "net_worth_usd": nwu,
        "prev_net_worth_try": old.get("net_worth_try", nwt),
        "fx_rates": {"usdtry": round(fx("USD"), 4), "eurtry": round(fx("EUR"), 4)},
        "asset_class_breakdown": breakdown,
        "holdings_with_prices": out,
        "quality_report": {"total_holdings": len(holdings), "successfully_fetched": fetched, "needs_quote": need},
        "reviewer_findings": old.get("reviewer_findings", []),
        "refresh_source": "live-http",
    }
    os.makedirs("output", exist_ok=True)
    with open("output/latest.json", "w", encoding="utf-8") as f:
        json.dump(latest, f, ensure_ascii=False, indent=2)

    # izleme listesi de canlı yenile + günlük geçmişe kaydet
    _refresh_watchlist()
    append_daily_history(nwt, nwu, "refresh")
    return {"net_worth_try": nwt, "net_worth_usd": nwu, "fetched": fetched,
            "total": len(holdings), "fx": latest["fx_rates"]}


def _refresh_watchlist():
    wl = [("BIST", "THYAO", "THYAO.IS", "TRY", "havacılık"),
          ("BIST", "KCHOL", "KCHOL.IS", "TRY", "holding"),
          ("NASDAQ", "MSFT", "MSFT", "USD", "Azure+Copilot"),
          ("NASDAQ", "AMD", "AMD", "USD", "AI çip · NVDA peer"),
          ("XETRA", "SAP", "SAP.DE", "EUR", "bulut/SaaS")]
    items = []
    for mkt, sym, tk, ccy, note in wl:
        p, prev = yf_quote(tk)
        chg = round((p - prev) / prev * 100, 2) if (p and prev) else None
        items.append({"market": mkt, "sym": sym, "ccy": ccy, "price": p, "chg_pct": chg, "note": note})
    try:
        with open("output/watchlist.json", "w", encoding="utf-8") as f:
            json.dump({"as_of": datetime.now(timezone.utc).isoformat(), "items": items},
                      f, ensure_ascii=False, indent=2)
    except Exception:
        pass


HIST_PATH = "output/history.json"

def _load_history():
    try:
        with open(HIST_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"daily": [], "runs": {"pipeline_count": 0, "tokens": 0, "last": None}}

def append_daily_history(net_try, net_usd, source="refresh"):
    """Günlük net-değeri kaydet (gün başına tek satır, en güncel kazanır)."""
    h = _load_history()
    today = datetime.now().astimezone().date().isoformat()
    daily = [d for d in h.get("daily", []) if d.get("date") != today]
    daily.append({"date": today, "net_worth_try": net_try,
                  "net_worth_usd": net_usd, "source": source})
    daily.sort(key=lambda d: d["date"])
    h["daily"] = daily[-180:]  # son ~6 ay
    try:
        with open(HIST_PATH, "w", encoding="utf-8") as f:
            json.dump(h, f, ensure_ascii=False, indent=2)
    except Exception:
        pass

def record_run(tokens=0):
    """Bir tam AI pipeline çalıştırmasını + harcanan token'ı kaydet."""
    h = _load_history()
    r = h.setdefault("runs", {"pipeline_count": 0, "tokens": 0, "last": None})
    r["pipeline_count"] = r.get("pipeline_count", 0) + 1
    r["tokens"] = r.get("tokens", 0) + int(tokens or 0)
    r["last"] = datetime.now().astimezone().isoformat()
    try:
        with open(HIST_PATH, "w", encoding="utf-8") as f:
            json.dump(h, f, ensure_ascii=False, indent=2)
    except Exception:
        pass
    return r


def fetch_news(ticker, count=6):
    """Yahoo Finance search API'den haber başlıkları çek."""
    url = f"https://query1.finance.yahoo.com/v1/finance/search?q={quote(ticker)}&quotesCount=0&newsCount={count}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    try:
        with urllib.request.urlopen(req, timeout=6) as r:
            d = json.load(r)
        items = []
        for n in d.get("news", []):
            items.append({
                "title": n.get("title", ""),
                "publisher": n.get("publisher", ""),
                "providerPublishTime": n.get("providerPublishTime", 0),
                "link": n.get("link", "")
            })
        return {"ticker": ticker, "count": len(items), "articles": items,
                "as_of": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        logging.warning("fetch_news %s: %s", ticker, e)
        return {"ticker": ticker, "count": 0, "articles": [], "error": "haberler alınamadı"}


def fetch_benchmark(days=30):
    """BIST100 + S&P500 + Altın getirisini çek, dönem getirisi hesapla."""
    rng = "1mo" if days <= 31 else "3mo"
    benches = [("BIST100", "XU100.IS", "TRY"), ("SP500", "^GSPC", "USD"), ("GOLD", "GC=F", "USD")]
    result = {}
    for name, ticker, ccy in benches:
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range={rng}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=8) as r:
                d = json.load(r)
            closes = d["chart"]["result"][0].get("indicators", {}).get("quote", [{}])[0].get("close", [])
            closes = [c for c in closes if c is not None]
            ret = round((closes[-1] - closes[0]) / closes[0] * 100, 2) if len(closes) >= 2 else None
            result[name] = {"ticker": ticker, "currency": ccy, "return_pct": ret, "points": len(closes)}
        except Exception:
            result[name] = {"ticker": ticker, "currency": ccy, "return_pct": None}
    portfolio_return = None
    try:
        h = _load_history()
        daily = h.get("daily", [])
        if len(daily) >= 2:
            first = daily[0]["net_worth_try"]; last = daily[-1]["net_worth_try"]
            portfolio_return = round((last - first) / first * 100, 2) if first else None
    except Exception:
        pass
    return {"period_days": days, "benchmarks": result,
            "portfolio_return_try_pct": portfolio_return,
            "as_of": datetime.now(timezone.utc).isoformat()}


def fetch_dividends():
    """Portföydeki hisselerin temettü bilgisini çek."""
    pf = "data/portfolio.json" if os.path.exists("data/portfolio.json") else "data/portfolio.sample.json"
    try:
        with open(pf, encoding="utf-8") as f:
            port = json.load(f)
    except Exception:
        return {"dividends": []}
    results = []
    for h in port.get("holdings", []):
        typ = (h.get("type") or "").lower()
        if typ not in ("equity", "fund"):
            continue
        hid = h.get("id", ""); tk = h.get("ticker", hid)
        if not safe_ticker(tk):
            results.append({"id": hid, "ticker": tk, "error": "geçersiz ticker"})
            continue
        url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{quote(tk)}?modules=summaryDetail"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        try:
            with urllib.request.urlopen(req, timeout=6) as r:
                d = json.load(r)
            sd = d.get("quoteSummary", {}).get("result", [{}])[0].get("summaryDetail", {})
            results.append({
                "id": hid, "ticker": tk,
                "dividend_yield": sd.get("dividendYield", {}).get("raw"),
                "dividend_rate": sd.get("dividendRate", {}).get("raw"),
                "ex_dividend_date": sd.get("exDividendDate", {}).get("fmt"),
                "payout_ratio": sd.get("payoutRatio", {}).get("raw")
            })
        except Exception:
            results.append({"id": hid, "ticker": tk, "error": "veri çekilemedi"})
    return {"dividends": results, "as_of": datetime.now(timezone.utc).isoformat()}


ALERTS_PATH = "output/alerts.json"

def load_alerts():
    try:
        with open(ALERTS_PATH, encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return {"alerts": []}

def save_alerts(data):
    os.makedirs("output", exist_ok=True)
    with open(ALERTS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def compute_rebalance():
    """Mevcut asset_class_breakdown vs hedef dağılım — delta ve işlem listesi."""
    targets = {"Emtia": 40.0, "Nakit": 20.0, "Hisse": 40.0}
    tolerance = 5.0
    try:
        with open("data/targets.json", encoding="utf-8") as f:
            td = json.load(f)
            targets = td.get("targets", targets)
            tolerance = td.get("tolerance_pct", tolerance)
    except Exception:
        pass
    try:
        with open("output/latest.json", encoding="utf-8") as f:
            latest = json.load(f)
    except Exception:
        return {"error": "output/latest.json bulunamadı. Önce /api/refresh çalıştır."}
    nwt = latest.get("net_worth_try", 0)
    breakdown = latest.get("asset_class_breakdown", {})
    current = {k: v.get("percentage", 0) for k, v in breakdown.items()}
    deviations, trades = {}, []
    for cls, tgt in targets.items():
        curr = current.get(cls, 0)
        delta = curr - tgt
        deviations[cls] = round(delta, 2)
        if abs(delta) > tolerance:
            trades.append({
                "action": "SAT" if delta > 0 else "AL",
                "class": cls,
                "delta_pct": round(delta, 2),
                "amount_try": round(abs(delta) / 100 * nwt),
                "reason": f"{cls} hedeften %{abs(round(delta,1))} {'fazla' if delta > 0 else 'eksik'}"
            })
    trades.sort(key=lambda t: abs(t["delta_pct"]), reverse=True)
    vol = sum(t["amount_try"] for t in trades)
    return {
        "rebalance_needed": len(trades) > 0,
        "current": current, "targets": targets, "tolerance_pct": tolerance,
        "deviations": deviations, "trades": trades,
        "total_trade_volume_try": vol, "net_worth_try": nwt,
        "summary": (f"{len(trades)} sınıf hedef dışı. Toplam hareket: ₺{vol:,.0f}" if trades
                    else "Denge iyi — tüm sınıflar tolerans içinde."),
        "as_of": datetime.now(timezone.utc).isoformat()
    }


class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/status"):
            # workflow (açık Claude session) pipeline-status.json yazar → UI'ya taşı
            try:
                with open("output/pipeline-status.json", encoding="utf-8") as f:
                    d = json.load(f)
                with LOCK:
                    STATUS.update({k: v for k, v in d.items() if k in ALLOWED_STATUS_KEYS})
            except Exception:
                pass
            with LOCK:
                self._json(dict(STATUS))
        elif self.path.startswith("/api/latest"):
            try:
                with open("output/latest.json", encoding="utf-8") as f: raw = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._cors(); self.end_headers()
                self.wfile.write(raw.encode())
            except Exception:
                self._json({"error": "output/latest.json bulunamadı"}, 404)
        elif self.path.startswith("/api/search"):
            # Yahoo Finance sembol araması — kullanıcı isim yazar, biz ticker öneririz
            q = (parse_qs(urlparse(self.path).query).get("q", [""])[0]).strip()
            if not q:
                return self._json({"results": []})
            url = f"https://query1.finance.yahoo.com/v1/finance/search?q={quote(q)}&quotesCount=8&newsCount=0"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            results = []
            try:
                with urllib.request.urlopen(req, timeout=6) as r:
                    d = json.load(r)
                tmap = {"EQUITY": "equity", "ETF": "fund", "MUTUALFUND": "fund",
                        "CRYPTOCURRENCY": "crypto", "CURRENCY": "cash", "FUTURE": "commodity",
                        "INDEX": "equity"}
                for it in d.get("quotes", []):
                    sym = it.get("symbol")
                    if not sym:
                        continue
                    results.append({
                        "symbol": sym,
                        "name": it.get("shortname") or it.get("longname") or sym,
                        "exchange": it.get("exchDisp") or it.get("exchange") or "",
                        "type": tmap.get(it.get("quoteType"), "equity"),
                    })
            except Exception:
                pass
            self._json({"results": results})
        elif self.path.startswith("/api/portfolio"):
            # mevcut portföyü forma yükle (yoksa sample)
            pf = "data/portfolio.json" if os.path.exists("data/portfolio.json") else "data/portfolio.sample.json"
            try:
                with open(pf, encoding="utf-8") as f:
                    self._json(json.load(f))
            except Exception as e:
                logging.warning("portfolio load: %s", e)
                self._json({"error": "portföy yüklenemedi"}, 404)
        elif self.path.startswith("/api/history"):
            self._json(_load_history())
        elif self.path.startswith("/api/news"):
            raw_ticker = parse_qs(urlparse(self.path).query).get("ticker", ["NVDA"])[0]
            ticker = safe_ticker(raw_ticker) or "NVDA"
            self._json(fetch_news(ticker))
        elif self.path.startswith("/api/benchmark"):
            try:
                days = min(max(int(parse_qs(urlparse(self.path).query).get("days", ["30"])[0]), 1), 365)
            except (ValueError, TypeError):
                days = 30
            self._json(fetch_benchmark(days))
        elif self.path.startswith("/api/dividends"):
            self._json(fetch_dividends())
        elif self.path.startswith("/api/alerts"):
            self._json(load_alerts())
        elif self.path.startswith("/api/rebalance"):
            self._json(compute_rebalance())
        elif self.path.startswith("/api/reports"):
            # output/ altındaki .md raporları listele (skill çıktıları)
            reports = []
            try:
                for fn in os.listdir("output"):
                    if not fn.endswith(".md") or fn == "README.md":
                        continue
                    path = os.path.join("output", fn)
                    # tip: dosya adının ilk parçasından (research, valuation, model, earnings, net, portfolio, yearend)
                    kind = fn.split("-")[0]
                    title = ""
                    try:
                        with open(path, encoding="utf-8") as f:
                            for line in f:
                                if line.startswith("#"):
                                    title = line.lstrip("#").strip(); break
                    except Exception: pass
                    reports.append({
                        "file": fn,
                        "kind": kind,
                        "title": title or fn,
                        "mtime": os.path.getmtime(path),
                        "size": os.path.getsize(path)
                    })
                reports.sort(key=lambda r: r["mtime"], reverse=True)
            except Exception: pass
            self._json({"reports": reports})
        else:
            clean = urlparse(self.path).path
            # Encoded/literal '..' traversal is rejected outright (also catches %2e%2e).
            if ".." not in unquote(clean) and (
                    clean in ("/", "/index.html")
                    or clean.startswith("/assets/")
                    or clean.startswith("/output/")):
                # Raw prefix passes; now confirm the RESOLVED path stays in-bounds.
                # translate_path collapses '..' and re-roots under cwd, so this
                # blocks /output/../pipeline_server.py and /assets/../data/portfolio.json.
                cwd = os.path.realpath(os.getcwd())
                resolved = os.path.realpath(self.translate_path(self.path))
                allowed_dirs = (os.path.join(cwd, "assets"), os.path.join(cwd, "output"))
                in_bounds = (
                    resolved == cwd                                  # directory root "/"
                    or resolved == os.path.join(cwd, "index.html")   # explicit index
                    or any(resolved == d or resolved.startswith(d + os.sep)
                           for d in allowed_dirs)
                )
                if in_bounds:
                    super().do_GET()
                    return
            self.send_response(403)
            self.send_header("Content-Type", "text/plain")
            self.end_headers()
            self.wfile.write(b"Forbidden")

    def do_POST(self):
        if self.path.startswith("/api/portfolio"):
            # UI formundan gelen portföyü data/portfolio.json'a yaz, sonra canlı yenile
            try:
                ln = int(self.headers.get("Content-Length", 0))
                if ln > MAX_BODY:
                    return self._json({"error": "İstek çok büyük"}, 413)
                body = json.loads(self.rfile.read(ln).decode("utf-8")) if ln else {}
                holdings = body.get("holdings", [])
                if not isinstance(holdings, list):
                    return self._json({"error": "holdings dizi olmalı"}, 400)
                for h in holdings:
                    if not isinstance(h, dict):
                        return self._json({"error": "Geçersiz varlık formatı"}, 400)
                    if h.get("type", "equity") not in VALID_HOLDING_TYPES:
                        return self._json({"error": f"Geçersiz tip: {h.get('type')}"}, 400)
                    hticker = h.get("ticker")
                    if hticker and not safe_ticker(hticker):
                        return self._json({"error": f"Geçersiz ticker formatı"}, 400)
                    for qf in ("quantity", "amount"):
                        val = h.get(qf)
                        if val is not None and not isinstance(val, (int, float)):
                            return self._json({"error": f"Geçersiz {qf} değeri"}, 400)
                doc = {"owner": body.get("owner", "user"),
                       "base_currency": (body.get("base_currency") or "TRY").upper(),
                       "note": "UI ⚙ Portföy Düzenle ile kaydedildi.",
                       "holdings": holdings}
                os.makedirs("data", exist_ok=True)
                with open("data/portfolio.json", "w", encoding="utf-8") as f:
                    json.dump(doc, f, ensure_ascii=False, indent=2)
                res = live_refresh()  # kaydeder kaydetmez canlı değerle
                self._json({"status": "saved", "holdings": len(holdings), **res})
            except Exception as e:
                logging.warning("portfolio save: %s", e)
                self._json({"error": "Portföy kaydedilemedi"}, 500)
        elif self.path.startswith("/api/refresh"):
            # Canlı fiyat + net-değer yenile (LLM YOK, sadece HTTP) — UI butonu bunu çağırır
            global _last_refresh
            now = time.time()
            if now - _last_refresh < REFRESH_COOLDOWN:
                return self._json({"error": f"Çok sık — lütfen {REFRESH_COOLDOWN}s bekleyin"}, 429)
            with LOCK:
                if STATUS.get("state") == "refreshing":
                    return self._json({"error": "Yenileme zaten sürüyor"}, 409)
                STATUS.update({"state": "refreshing", "message": "Canlı fiyatlar çekiliyor...", "progress": 30})
            _last_refresh = now
            try:
                res = live_refresh()
                with LOCK:
                    STATUS.update({"state": "done", "progress": 100,
                                   "message": f"✓ Canlı yenilendi — ₺{res['net_worth_try']:,.0f} ({res['fetched']}/{res['total']})"})
                self._json({"status": "ok", **res})
            except Exception as e:
                logging.warning("live_refresh: %s", e)
                with LOCK:
                    STATUS.update({"state": "error", "message": "Yenileme hatası", "progress": 0})
                self._json({"error": "Fiyat yenileme başarısız"}, 500)
        elif self.path.startswith("/api/record-run"):
            # bir tam AI pipeline çalıştırmasını + token'ı kaydet (?tokens=N)
            tokens = 0
            if "?" in self.path:
                for kv in self.path.split("?", 1)[1].split("&"):
                    if kv.startswith("tokens="):
                        try: tokens = int(kv.split("=", 1)[1])
                        except Exception: pass
            r = record_run(tokens)
            self._json({"status": "recorded", **r})
        elif self.path.startswith("/api/alerts"):
            try:
                ln = int(self.headers.get("Content-Length", 0))
                if ln > MAX_BODY:
                    return self._json({"error": "İstek çok büyük"}, 413)
                body = json.loads(self.rfile.read(ln).decode("utf-8")) if ln else {}
                if not isinstance(body, dict):
                    return self._json({"error": "Geçersiz istek"}, 400)
                save_alerts(body)
                self._json({"status": "saved"})
            except Exception as e:
                logging.warning("save_alerts: %s", e)
                self._json({"error": "Geçersiz istek"}, 400)
        elif self.path.startswith("/api/rebalance"):
            self._json(compute_rebalance())
        elif self.path.startswith("/api/run"):
            # GÜVENLİ: server claude'u ÇALIŞTIRMAZ — sadece sinyal dosyası yazar.
            # Açık Claude session'ındaki watcher bu sinyali görüp workflow'u çalıştırır.
            with LOCK:
                STATUS.update({"state": "running", "progress": 10,
                               "message": "AI analizi istendi — Claude watcher bekleniyor..."})
            os.makedirs("output", exist_ok=True)
            now_iso = datetime.now().astimezone().isoformat()
            with open("output/pipeline-trigger.json", "w", encoding="utf-8") as f:
                json.dump({"triggered_at": now_iso, "by": "finops-terminal-ui"}, f)
            # status'u running'e çek (watcher bitirene kadar eski 'done' görünmesin)
            with open("output/pipeline-status.json", "w", encoding="utf-8") as f:
                json.dump({"state": "running", "progress": 10,
                           "message": "AI analizi istendi — Claude watcher bekleniyor..."}, f)
            self._json({"status": "triggered",
                        "note": "Sinyal yazıldı. Açık Claude session'ı pipeline'ı çalıştıracak; /api/status ile izle."})
        else:
            self.send_response(404); self.end_headers()

    def _json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors(); self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")
        self.send_header(
            "Content-Security-Policy",
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline'; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "img-src 'self' data:; "
            "frame-ancestors 'none'"
        )
        super().end_headers()

    def _cors(self):
        origin = self.headers.get("Origin", "")
        allowed_origins = {
            "http://localhost:8765", "http://127.0.0.1:8765",
            "http://localhost:8766", "http://127.0.0.1:8766",
        }
        if origin in allowed_origins:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

    def log_message(self, fmt, *args):
        pass  # quiet


if __name__ == "__main__":
    port = int(os.environ.get("FINOPS_PORT", "8765"))
    # Güvenlik: varsayılan localhost. Docker için FINOPS_BIND=0.0.0.0 verilir.
    host = os.environ.get("FINOPS_BIND", "127.0.0.1")
    print(f"FinOps Terminal  →  http://localhost:{port}/  (bind {host})")
    print(f"Hızlı fiyat       →  POST /api/refresh (Python, LLM yok)")
    print(f"AI analiz sinyali →  POST /api/run (sinyal dosyası; açık Claude watcher çalıştırır)")
    HTTPServer((host, port), Handler).serve_forever()
