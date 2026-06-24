# Claude FinOps Terminal — dashboard server (stdlib Python, sıfır bağımlılık)
# NOT: Agent pipeline'ı (skill + subagent) Claude Code host tarafında çalışır;
# bu container yalnızca terminali ve output/ verisini sunar.
FROM python:3.12-slim@sha256:d764629ce0ddd8c71fd371e9901efb324a95789d2315a47db7e4d27e78f1b0e9

LABEL org.opencontainers.image.title="Claude FinOps Terminal" \
      org.opencontainers.image.description="Claude-native FinOps agent template — portföy net-değeri & analiz terminali" \
      org.opencontainers.image.licenses="MIT"

WORKDIR /app

# Sadece sunucu için gerekenler (.dockerignore kişisel veriyi hariç tutar; .sample dosyalar kopyalanır)
COPY pipeline_server.py index.html ./
COPY assets ./assets
COPY data ./data
COPY output ./output

EXPOSE 8765

# Liveness probe — stdlib-only (urllib), /api/status her zaman 200 döner
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["python3", "-c", "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8765/api/status', timeout=2).status==200 else 1)"]

# Root olarak çalıştırma — ayrı kullanıcı oluştur
RUN useradd --no-create-home --shell /bin/false finops && \
    chown -R finops:finops /app
USER finops

# Server cwd'deki dosyaları + /api/* uçlarını sunar
CMD ["python3", "pipeline_server.py"]
