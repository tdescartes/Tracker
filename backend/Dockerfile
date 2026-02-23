# ── Stage 1: Build ──────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /app

# System deps for PaddleOCR (primary OCR) + libpq for asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Stage 2: Runtime ─────────────────────────────────────────
FROM python:3.11-slim

WORKDIR /app

# Runtime deps for PaddleOCR (OpenCV needs libgl + libglib)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages
COPY --from=builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application code
COPY . .

# Create uploads dir
RUN mkdir -p /app/uploads

# Non-root user for security
RUN useradd -m -u 1000 tracker && chown -R tracker:tracker /app
USER tracker

EXPOSE 8000

# Health check — uses /api/health which also verifies DB
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
