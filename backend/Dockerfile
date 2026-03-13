FROM python:3.13-slim

WORKDIR /app

# System deps for Pillow and general build support
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libjpeg62-turbo-dev \
        libwebp-dev \
        zlib1g-dev \
        libtiff-dev \
        libffi-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ app/

# Data directory is mounted as a volume at runtime
RUN mkdir -p /app/data/thumbnails /app/data/chromadb

ENV PHOTOTAG_DATA_DIR=/app/data \
    PHOTOTAG_DB_PATH=/app/data/phototag.db \
    PHOTOTAG_CHROMADB_PATH=/app/data/chromadb \
    PHOTOTAG_THUMBNAIL_DIR=/app/data/thumbnails \
    PHOTOTAG_OLLAMA_BASE_URL=http://ollama:11434 \
    PHOTOTAG_FRONTEND_URL=http://localhost

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
