FROM python:3.10-slim

# Security: run as non-root user
RUN groupadd --gid 1000 aibrain && \
    useradd --uid 1000 --gid aibrain --shell /bin/bash --create-home aibrain

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/
COPY alembic.ini .

# Create model cache directory
RUN mkdir -p /app/model_cache && chown -R aibrain:aibrain /app

USER aibrain

EXPOSE 8000

# Run migrations then start API
CMD ["sh", "-c", "python -m alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1"]
