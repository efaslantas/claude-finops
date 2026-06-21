# Claude FinOps Terminal — dashboard server (stdlib Python, sıfır bağımlılık)
# NOT: Agent pipeline'ı (skill + subagent) Claude Code host tarafında çalışır;
# bu container yalnızca terminali ve output/ verisini sunar.
FROM python:3.12-slim

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

# Root olarak çalıştırma — ayrı kullanıcı oluştur
RUN useradd --no-create-home --shell /bin/false finops && \
    chown -R finops:finops /app
USER finops

# Server cwd'deki dosyaları + /api/* uçlarını sunar
CMD ["python3", "pipeline_server.py"]
