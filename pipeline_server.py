#!/usr/bin/env python3
"""
FinOps Terminal — statik dosya sunucusu + JSON köprüsü (yalnızca Python stdlib).

Uçlar:
  GET  /                  → index.html (terminal UI)
  GET  /assets/*          → assets/ (CSS, JS — read-only)
  GET  /output/*          → output/ (JSON + MD raporlar — read-only)
  GET  /api/latest        → output/latest.json
  GET  /api/status        → pipeline durumu
  GET  /api/history       → output/history.json
  GET  /api/reports       → output/*.md skill çıktıları listesi
  POST /api/refresh       → canlı fiyat çek + net-değer hesapla (LLM YOK, sadece HTTP)
  POST /api/run           → AI analiz SİNYALİ yazar (claude'u ÇALIŞTIRMAZ; RCE yok)
  POST /api/record-run    → tam pipeline çalıştırmasını + token'ı kaydeder

Güvenlik: varsayılan bind 127.0.0.1 (FINOPS_BIND ile değişir). Server hiçbir zaman
claude/alt süreç çalıştırmaz; AI işini açık Claude Code session'ı (watcher) yapar.
Statik dosya sunucu yalnızca index.html, assets/ ve output/ dizinlerine erişim verir;
pipeline_server.py, data/ ve .claude/ hiçbir zaman serve edilmez.
"""
import json, threading, os, re, time, posixpath, urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timezone
from urllib.parse import urlparse, parse_qs, quote, unquote

STATUS = {"state": "idle", "message": "Hazır", "progress": 0}
LOCK = threading.Lock()

GRAM_PER_OZ = 31.1035

# ── Güvenlik sabitleri ────────────────────────────────────────────────────────
_LAST_REFRESH = {"t": 0.0}      # rate-limit izleyici (LOCK korumalı)
_REFRESH_COOLDOWN = 10           # /api/refresh minimum aralığı (saniye)
_MAX_BODY = 65_536               # 64 KB POST body hard limit
_MAX_TOKENS = 10_000_000         # token sayacı üst sınırı
_TICKER_RE = re.compile(r'^[A-Z0-9.\-\^=]{1,20}$')
_CORS_ORIGIN = os.environ.get("FINOPS_CORS", "*")  # prod'da localhost adresini ver
_MIME = {
    ".html": "text/html; charset=utf-8",
    ".css":  "text/css",
    ".js":   "application/javascript",
    ".json": "application/json",
    ".md":   "text/plain; charset=utf-8",
    ".png":  "image/png", ".jpg": "image/jpeg",
    ".svg":  "image/svg+xml", ".ico": "image/x-icon",
}


def yf_quote(ticker):
    """Yahoo Finance v8 chart API'den fiyat + önceki kapanış. (price, prev_close) ya da (None, None)."""
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

    fxa = port.get("fx_assumptions", {})
    usdtry, _ = yf_quote("USDTRY=X")
    eurtry, _ = yf_quote("EURTRY=X")
    usdtry = usdtry or fxa.get("usdtry", 46.0)
    eurtry = eurtry or fxa.get("eurtry", 53.0)
    gold_usd, _ = yf_quote("GC=F")
    gram_try = (gold_usd * usdtry / GRAM_PER_OZ) if gold_usd else None

    bist_tk = {"TUPRS": "TUPRS.IS", "ASELS": "ASELS.IS"}
    us_tk = {"NVDA": "NVDA", "GOOGL": "GOOGL"}
    eu_tk = {"MBG": "MBG.DE"}

    out, fetched = [], 0
    for h in holdings:
        hid, qs = h.get("id"), h.get("quote_source")
        row = {"id": hid}
        if qs == "none":  # TL nakit
            row.update(amount=h.get("amount", 0), value_try=round(h.get("amount", 0)))
        elif qs == "usdtry":
            amt = h.get("amount", 0); row.update(amount=amt, rate=usdtry, value_try=round(amt * usdtry))
        elif qs == "eurtry":
            amt = h.get("amount", 0); row.update(amount=amt, rate=eurtry, value_try=round(amt * eurtry))
        elif qs == "gold_try":
            g = h.get("quantity_grams", 0)
            if gram_try: fetched += 1
            row.update(quantity_grams=g, price_try=round(gram_try, 4) if gram_try else None,
                       value_try=round(g * gram_try) if gram_try else 0)
        elif qs == "bist":
            p, _ = yf_quote(bist_tk.get(hid, hid + ".IS")); q = h.get("quantity", 0)
            if p: fetched += 1
            row.update(quantity=q, price=p, value_try=round(q * p) if p else 0)
        elif qs == "us_equity":
            p, _ = yf_quote(us_tk.get(hid, hid)); q = h.get("quantity", 0)
            if p: fetched += 1
            row.update(quantity=q, price=p, price_usd=p, value_try=round(q * p * usdtry) if p else 0)
        elif qs == "eu_equity":
            p, _ = yf_quote(eu_tk.get(hid, hid + ".DE")); q = h.get("quantity", 0)
            if p: fetched += 1
            row.update(quantity=q, price=p, price_eur=p, value_try=round(q * p * eurtry) if p else 0)
        else:
            row.update(value_try=0)
        out.append(row)

    nwt = sum(r.get("value_try", 0) for r in out)
    nwu = round(nwt / usdtry) if usdtry else 0
    altin = sum(r["value_try"] for r in out if r["id"] == "GRAM_ALTIN")
    nakit = sum(r["value_try"] for r in out if r["id"] in ("TL_CASH", "USD_CASH", "EUR_CASH"))
    hisse = sum(r["value_try"] for r in out if r["id"] in ("NVDA", "GOOGL", "TUPRS", "ASELS", "MBG"))
    pc = lambda v: round(v / nwt * 10000) / 100 if nwt else 0

    latest = {
        "timestamp": datetime.now().astimezone().isoformat(),
        "net_worth_try": nwt,
        "net_worth_usd": nwu,
        "prev_net_worth_try": old.get("net_worth_try", nwt),
        "fx_rates": {"usdtry": round(usdtry, 4), "eurtry": round(eurtry, 4)},
        "asset_class_breakdown": {
            "Emtia": {"value": altin, "percentage": pc(altin)},
            "Nakit": {"value": nakit, "percentage": pc(nakit)},
            "Hisse": {"value": hisse, "percentage": pc(hisse)},
        },
        "holdings_with_prices": out,
        "quality_report": {"total_holdings": len(holdings), "successfully_fetched": fetched},
        # AI bulgular son Claude çalıştırmasından korunur (Python LLM çalıştıramaz)
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
    r["tokens"] = r.get("tokens", 0) + min(int(tokens or 0), _MAX_TOKENS)
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
        return {"ticker": ticker, "count": 0, "articles": [], "error": str(e)}


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
    # Portföy getirisi (history.json'dan)
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
    equity_qs = {"bist", "us_equity", "eu_equity", "equity"}
    results = []
    for h in port.get("holdings", []):
        qs = h.get("quote_source", "")
        if qs not in equity_qs:
            continue
        hid = h.get("id", "")
        tk = h.get("ticker") or (hid + ".IS" if qs == "bist" else hid)
        url = f"https://query1.finance.yahoo.com/v10/finance/quoteSummary/{tk}?modules=summaryDetail"
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


class Handler(BaseHTTPRequestHandler):

    # ── Güvenlik yardımcıları ─────────────────────────────────────────────────

    def version_string(self):
        return "FinOps/1.0"

    def _security_headers(self):
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("X-Frame-Options", "DENY")
        self.send_header("Referrer-Policy", "no-referrer")

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", _CORS_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")

    def _json(self, data, code=200):
        body = json.dumps(data, ensure_ascii=False).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self._cors()
        self._security_headers()
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, fpath, ctype):
        """Dosyayı güvenli şekilde serve et — path CWD içinde doğrulanmış olmalı."""
        if not os.path.isfile(fpath):
            self.send_response(404)
            self._security_headers()
            self.end_headers()
            return
        try:
            with open(fpath, "rb") as f:
                data = f.read()
        except (PermissionError, OSError):
            self.send_response(403)
            self._security_headers()
            self.end_headers()
            return
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self._security_headers()
        self.end_headers()
        self.wfile.write(data)

    def _serve_static(self, raw_path):
        """
        Güvenli statik dosya sunucu.
        Yalnızca index.html, assets/ ve output/ dizinlerine izin verilir.
        pipeline_server.py, data/ ve .claude/ hiçbir zaman serve edilmez.
        """
        # Query string + URL encoding temizle
        path = unquote(raw_path.split("?")[0])
        # posixpath.normpath /../.. gibi traversal'ları / köküne indirger
        path = posixpath.normpath(path)

        # Kök → index.html
        if path in ("/", "/index.html"):
            return self._send_file("index.html", "text/html; charset=utf-8")

        # İzin verilen dizin eşlemeleri: URL prefix → disk dizini
        allowed = [("/assets/", "assets"), ("/output/", "output")]
        for url_pfx, dir_pfx in allowed:
            if path.startswith(url_pfx):
                rel = path[len(url_pfx):]
                # İkinci kat traversal koruması: '..' segment içermemeli
                if any(seg == ".." for seg in rel.split("/")):
                    self.send_response(403)
                    self._security_headers()
                    self.end_headers()
                    return
                fpath = os.path.join(dir_pfx, rel)
                ext = os.path.splitext(rel)[1].lower()
                ctype = _MIME.get(ext, "application/octet-stream")
                return self._send_file(fpath, ctype)

        # Hiçbir izin verilen path ile eşleşmedi
        self.send_response(404)
        self._security_headers()
        self.end_headers()

    # ── HTTP metodları ────────────────────────────────────────────────────────

    def do_OPTIONS(self):
        self.send_response(200)
        self._cors()
        self._security_headers()
        self.end_headers()

    def do_GET(self):
        if self.path.startswith("/api/status"):
            # workflow (açık Claude session) pipeline-status.json yazar → UI'ya taşı
            try:
                with open("output/pipeline-status.json", encoding="utf-8") as f:
                    d = json.load(f)
                with LOCK:
                    STATUS.update(d)
            except Exception:
                pass
            with LOCK:
                self._json(dict(STATUS))
        elif self.path.startswith("/api/latest"):
            try:
                with open("output/latest.json") as f: raw = f.read()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._cors()
                self._security_headers()
                self.end_headers()
                self.wfile.write(raw.encode())
            except Exception:
                self._json({"error": "output/latest.json bulunamadı"}, 404)
        elif self.path.startswith("/api/history"):
            self._json(_load_history())
        elif self.path.startswith("/api/news"):
            raw_ticker = parse_qs(urlparse(self.path).query).get("ticker", ["NVDA"])[0]
            # Ticker güvenli format kontrolü
            ticker = raw_ticker.upper()
            if not _TICKER_RE.match(ticker):
                return self._json({"error": "Geçersiz ticker formatı"}, 400)
            self._json(fetch_news(ticker))
        elif self.path.startswith("/api/benchmark"):
            try:
                days = int(parse_qs(urlparse(self.path).query).get("days", ["30"])[0])
                days = max(1, min(days, 365))  # 1–365 aralığında sınırla
            except (ValueError, IndexError):
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
                    kind = fn.split("-")[0]
                    title = ""
                    try:
                        with open(path) as f:
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
            # Güvenli statik dosya sunucu — yalnızca assets/ ve output/ izinli
            self._serve_static(self.path)

    def do_POST(self):
        if self.path.startswith("/api/refresh"):
            # Rate limit: aynı anda birden fazla yenileme isteğini engelle
            now = time.time()
            with LOCK:
                if STATUS.get("state") == "refreshing":
                    return self._json({"error": "Yenileme zaten sürüyor"})
                if now - _LAST_REFRESH["t"] < _REFRESH_COOLDOWN:
                    wait = int(_REFRESH_COOLDOWN - (now - _LAST_REFRESH["t"]))
                    return self._json({"error": f"Çok sık istek. {wait}s bekleyin."}, 429)
                _LAST_REFRESH["t"] = now
                STATUS.update({"state": "refreshing", "message": "Canlı fiyatlar çekiliyor...", "progress": 30})
            try:
                res = live_refresh()
                with LOCK:
                    STATUS.update({"state": "done", "progress": 100,
                                   "message": f"✓ Canlı yenilendi — ₺{res['net_worth_try']:,.0f} ({res['fetched']}/{res['total']})"})
                self._json({"status": "ok", **res})
            except Exception as e:
                with LOCK:
                    STATUS.update({"state": "error", "message": f"Yenileme hatası: {e}", "progress": 0})
                self._json({"error": str(e)}, 500)
        elif self.path.startswith("/api/record-run"):
            # bir tam AI pipeline çalıştırmasını + token'ı kaydet (?tokens=N)
            tokens = 0
            if "?" in self.path:
                for kv in self.path.split("?", 1)[1].split("&"):
                    if kv.startswith("tokens="):
                        try:
                            tokens = min(int(kv.split("=", 1)[1]), _MAX_TOKENS)
                        except Exception:
                            pass
            r = record_run(tokens)
            self._json({"status": "recorded", **r})
        elif self.path.startswith("/api/alerts"):
            # Body boyutu limiti
            try:
                ln = int(self.headers.get("Content-Length", 0))
            except (ValueError, TypeError):
                ln = 0
            if ln > _MAX_BODY:
                return self._json({"error": "İstek gövdesi çok büyük"}, 413)
            try:
                body = json.loads(self.rfile.read(ln).decode("utf-8")) if ln else {}
            except (json.JSONDecodeError, UnicodeDecodeError):
                return self._json({"error": "Geçersiz JSON"}, 400)
            # Alarm kayıtlarını sanitize et: yalnızca bilinen format
            raw_alerts = body.get("alerts", [])
            clean = []
            for a in raw_alerts:
                tk = str(a.get("ticker", "")).upper().strip()
                if not _TICKER_RE.match(tk):
                    continue
                try:
                    price = float(a.get("price", 0))
                    if price <= 0 or price > 1_000_000_000:
                        continue
                except (ValueError, TypeError):
                    continue
                direction = a.get("dir", "above")
                if direction not in ("above", "below"):
                    direction = "above"
                clean.append({"ticker": tk, "dir": direction, "price": price})
            save_alerts({"alerts": clean})
            self._json({"status": "saved"})
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
            with open("output/pipeline-status.json", "w", encoding="utf-8") as f:
                json.dump({"state": "running", "progress": 10,
                           "message": "AI analizi istendi — Claude watcher bekleniyor..."}, f)
            self._json({"status": "triggered",
                        "note": "Sinyal yazıldı. Açık Claude session'ı pipeline'ı çalıştıracak; /api/status ile izle."})
        else:
            self.send_response(404)
            self._security_headers()
            self.end_headers()

    def log_message(self, fmt, *args):
        pass  # quiet


if __name__ == "__main__":
    port = 8765
    host = os.environ.get("FINOPS_BIND", "127.0.0.1")
    print(f"FinOps Terminal  →  http://localhost:{port}/  (bind {host})")
    print(f"Hızlı fiyat       →  POST /api/refresh (Python, LLM yok)")
    print(f"AI analiz sinyali →  POST /api/run (sinyal dosyası; açık Claude watcher çalıştırır)")
    HTTPServer((host, port), Handler).serve_forever()
