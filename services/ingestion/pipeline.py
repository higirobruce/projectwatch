"""
ProjectWatch Rwanda — Satellite Image Processing Service (Phase 1 scaffold).

Responsibilities (foundation phase):
  - Retrieve satellite scenes (Sentinel-1 / Sentinel-2 / Landsat) for a project boundary.
  - Preprocess raster data (coregistration, clipping to boundary, indexing).
  - Stage processed rasters to object storage (MinIO / S3-compatible).

This module is a skeleton: it defines the pipeline interface and a minimal
processing stub using GDAL/Rasterio so the service runs in Docker on the M2
profile without heavy downloads. Real ingestion wiring lands in later tasks.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("projectwatch.ingestion")

# Avoid importing heavy native libs at module load so the service can boot
# on constrained hardware; import lazily inside functions that need them.

MINIO_ENDPOINT = "http://minio:9000"
RAW_BUCKET = "satellite-raw"
PROCESSED_BUCKET = "satellite-processed"


@dataclass
class Scene:
    scene_id: str
    source: str  # sentinel-1 | sentinel-2 | landsat
    geometry_wkt: str
    uri: str


@dataclass
class ProcessedScene:
    scene_id: str
    output_uri: str
    width: int
    height: int


def retrieve_scenes(boundary_wkt: str, source: str = "sentinel-2") -> list[Scene]:
    """Search and download scenes intersecting the project boundary.

    Stub: in production this queries a catalogue (e.g. STAC / Copernicus)
    and downloads to local cache. Returns an empty list until wired.
    """
    logger.info("retrieve_scenes stub for %s over %s", source, boundary_wkt[:40])
    return []


def preprocess(scene: Scene, boundary_wkt: str, workdir: Path) -> ProcessedScene:
    """Clip + reproject a scene to the project boundary using GDAL/Rasterio.

    Lazily imports rasterio/gdal to keep boot light on the M2 profile.
    """
    from osgeo import gdal  # noqa: F401  (ensures GDAL present in image)
    import rasterio
    from rasterio.mask import mask

    workdir.mkdir(parents=True, exist_ok=True)
    logger.info("preprocess stub for %s", scene.scene_id)

    # Placeholder dimensions; real clip/mask logic replaces this.
    with rasterio.open(scene.uri) as ds:
        processed = ProcessedScene(
            scene_id=scene.scene_id,
            output_uri=str(workdir / f"{scene.scene_id}.tif"),
            width=ds.width,
            height=ds.height,
        )
    return processed


def stage_to_object_storage(processed: ProcessedScene, bucket: str = PROCESSED_BUCKET) -> str:
    """Upload processed raster to MinIO/S3. Stub until boto3 wiring lands."""
    logger.info("stage_to_object_storage stub -> %s/%s", bucket, processed.scene_id)
    return processed.output_uri


def run_pipeline(boundary_wkt: str, source: str = "sentinel-2") -> list[ProcessedScene]:
    scenes = retrieve_scenes(boundary_wkt, source)
    results: list[ProcessedScene] = []
    for scene in scenes:
        processed = preprocess(scene, boundary_wkt, Path("/tmp/projectwatch"))
        stage_to_object_storage(processed)
        results.append(processed)
    return results


if __name__ == "__main__":
    logger.info("ProjectWatch ingestion service ready (scaffold).")
