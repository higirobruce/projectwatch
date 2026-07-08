"""
Ingestion worker (Phase 1 — Satellite Data Integration).

Polls the ProjectWatch API for pending ingestion jobs, retrieves satellite
scenes for each project's boundary, preprocesses them, stages rasters to
object storage (MinIO / S3), and reports results back to the API.

Run with:  python worker.py  (inside the ingestion container)
"""
from __future__ import annotations

import os
import sys
import time

import requests

API_URL = os.environ.get("API_URL", "http://localhost:4000").rstrip("/")
PROVIDER = os.environ.get("PROVIDER", "mock")
SOURCE = os.environ.get("INGESTION_SOURCE", "sentinel-2")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "10"))
SCENE_COUNT = int(os.environ.get("SCENE_COUNT", "2"))
MINIO_BUCKET = os.environ.get("MINIO_BUCKET", "satellite-processed")
WORKDIR = os.environ.get("WORKDIR", "/tmp/projectwatch/processed")


def _provider():
    if PROVIDER == "stac":
        from providers import STACProvider
        return STACProvider()
    from providers import MockProvider
    return MockProvider(workdir=os.path.join(WORKDIR, "scenes"))


def _minio_client():
    import boto3

    return boto3.client(
        "s3",
        endpoint_url=os.environ.get("MINIO_ENDPOINT", "http://minio:9000"),
        aws_access_key_id=os.environ.get("MINIO_ACCESS_KEY", "minioadmin"),
        aws_secret_access_key=os.environ.get("MINIO_SECRET_KEY", "minioadmin"),
    )


def _ensure_bucket(s3):
    try:
        s3.head_bucket(Bucket=MINIO_BUCKET)
    except Exception:
        s3.create_bucket(Bucket=MINIO_BUCKET)


def _patch(job_id: str, payload: dict) -> None:
    requests.patch(f"{API_URL}/api/ingestions/{job_id}", json=payload, timeout=30).raise_for_status()


def process_job(job: dict) -> None:
    from pipeline import preprocess
    from providers import Scene

    job_id = job["id"]
    project_id = job["projectId"]
    _patch(job_id, {"status": "processing"})

    project = requests.get(f"{API_URL}/api/projects/{project_id}", timeout=30).json()
    boundary = project["boundary"]

    provider = _provider()
    scenes = provider.retrieve(boundary, count=SCENE_COUNT)

    s3 = _minio_client()
    _ensure_bucket(s3)

    processed = []
    acquired_dates = []
    for scene in scenes:
        ps = preprocess(
            Scene(scene_id=scene.scene_id, acquired_at=scene.acquired_at, source=scene.source, assets=scene.assets),
            boundary,
            WORKDIR,
            MINIO_BUCKET,
        )
        object_name = f"{project_id}/{os.path.basename(ps.local_path)}"
        s3.upload_file(ps.local_path, MINIO_BUCKET, object_name)
        processed.append(
            {"sceneId": ps.scene_id, "acquiredAt": ps.acquired_at, "rasterKey": object_name, "source": ps.source}
        )
        acquired_dates.append(ps.acquired_at)

    _patch(
        job_id,
        {
            "status": "done",
            "scenes": processed,
            "acquiredAt": max(acquired_dates) if acquired_dates else None,
        },
    )
    print(f"[worker] job {job_id}: processed {len(processed)} scenes")


def run() -> None:
    print(f"[worker] monitoring {API_URL}/api/ingestions/pending (provider={PROVIDER})")
    while True:
        try:
            resp = requests.get(f"{API_URL}/api/ingestions/pending", timeout=30)
            resp.raise_for_status()
            jobs = resp.json().get("ingestions", [])
        except requests.RequestException as e:
            print(f"[worker] poll error: {e}", file=sys.stderr)
            time.sleep(POLL_INTERVAL)
            continue

        for job in jobs:
            try:
                process_job(job)
            except Exception as e:  # keep the loop alive
                print(f"[worker] job {job['id']} failed: {e}", file=sys.stderr)
                try:
                    _patch(job["id"], {"status": "failed", "error": str(e)[:500]})
                except Exception:
                    pass

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
