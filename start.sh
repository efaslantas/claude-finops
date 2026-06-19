#!/usr/bin/env bash
# FinOps Terminal — tek komutla başlat
# Kullanım: ./start.sh

PORT=8765
DIR="$(cd "$(dirname "$0")" && pwd)"
URL="http://localhost:$PORT/"

if lsof -ti:$PORT >/dev/null 2>&1; then
  echo "✓ Server zaten çalışıyor → $URL"
else
  echo "▶ FinOps Terminal başlatılıyor (port $PORT)..."
  cd "$DIR"
  nohup python3 pipeline_server.py > /tmp/finops-server.log 2>&1 &
  sleep 1
  if lsof -ti:$PORT >/dev/null 2>&1; then
    echo "✓ Server ayakta → $URL"
  else
    echo "✗ Server başlamadı. Log: /tmp/finops-server.log"
    exit 1
  fi
fi

# macOS: open, Linux: xdg-open
( command -v open >/dev/null && open "$URL" ) || ( command -v xdg-open >/dev/null && xdg-open "$URL" ) || echo "Tarayıcıda aç: $URL"
