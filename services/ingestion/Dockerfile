# ProjectWatch ingestion service — runs on MacBook Air M2 (16 GB) via Docker.
# Uses the official OSGeo GDAL image so GDAL/Rasterio are system-provided
# (no fragile native pip builds), keeping the image lean and ARM-friendly.
FROM ghcr.io/osgeo/gdal:ubuntu-small-latest

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN python3 -m venv /opt/venv \
    && /opt/venv/bin/pip install --no-cache-dir -r requirements.txt
ENV PATH="/opt/venv/bin:${PATH}"

COPY providers.py pipeline.py worker.py ./

# Worker mode by default; `python worker.py` polls the API for pending jobs.
CMD ["python", "worker.py"]
