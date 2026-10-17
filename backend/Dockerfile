# syntax=docker/dockerfile:1
# ── Stage 1: Dependency Builder ──
FROM python:3.12-slim AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /build

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ── Stage 2: Runtime Container ──
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/install/bin:$PATH" \
    PYTHONPATH="/install/lib/python3.12/site-packages:$PYTHONPATH"

WORKDIR /app

# Create unprivileged application user
RUN useradd -m -u 10001 appuser

# Copy installed Python packages from builder
COPY --from=builder /install /install

# Copy application source code with correct ownership
COPY --chown=appuser:appuser . .

USER appuser

EXPOSE 8000

# Health check against dedicated liveness probe
HEALTHCHECK --interval=20s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/health/live')" || exit 1

CMD ["sh", "-c", "alembic upgrade head && python -m app.seed languages && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
