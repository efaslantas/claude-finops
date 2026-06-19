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
import json, threading, os, urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from datetime import datetime, timezone

STATUS = {"state": "idle", "message": "Hazır", "progress": 0}
LOCK = threading.Lock()

GRAM_PER_OZ = 31.1035


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


class Handler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self._cors(); self.end_headers()

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
                self._cors(); self.end_headers()
                self.wfile.write(raw.encode())
            except Exception:
                self._json({"error": "output/latest.json bulunamadı"}, 404)
        elif self.path.startswith("/api/portfolio"):
            # mevcut portföyü forma yükle (yoksa sample)
            pf = "data/portfolio.json" if os.path.exists("data/portfolio.json") else "data/portfolio.sample.json"
            try:
                with open(pf, encoding="utf-8") as f:
                    self._json(json.load(f))
            except Exception as e:
                self._json({"error": str(e)}, 404)
        elif self.path.startswith("/api/history"):
            self._json(_load_history())
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
            super().do_GET()

    def do_POST(self):
        if self.path.startswith("/api/portfolio"):
            # UI formundan gelen portföyü data/portfolio.json'a yaz, sonra canlı yenile
            try:
                ln = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(ln).decode("utf-8")) if ln else {}
                holdings = body.get("holdings", [])
                if not isinstance(holdings, list):
                    return self._json({"error": "holdings dizi olmalı"}, 400)
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
                self._json({"error": str(e)}, 500)
        elif self.path.startswith("/api/refresh"):
            # Canlı fiyat + net-değer yenile (LLM YOK, sadece HTTP) — UI butonu bunu çağırır
            with LOCK:
                if STATUS.get("state") == "refreshing":
                    return self._json({"error": "Yenileme zaten sürüyor"})
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
                        try: tokens = int(kv.split("=", 1)[1])
                        except Exception: pass
            r = record_run(tokens)
            self._json({"status": "recorded", **r})
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

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
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
