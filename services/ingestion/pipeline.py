"""
Processing pipeline (Phase 1 — Satellite Data Integration).

For each retrieved scene: clip/reproject to the project boundary and compute a
normalized-difference index (NDVI when NIR+Red bands are available), then stage
the processed raster to object storage (MinIO / S3-compatible).
"""
from __future__ import annotations

import os
from dataclasses import dataclass

import rasterio
from rasterio.mask import mask
from rasterio.warp import calculate_default_transform, reproject, Resampling


@dataclass
class ProcessedScene:
    scene_id: str
    acquired_at: str
    source: str
    raster_key: str
    local_path: str


def preprocess(scene, boundary_geojson: dict, workdir: str, bucket: str) -> ProcessedScene:
    """Clip scene to boundary, compute NDVI, write a processed GeoTIFF."""
    os.makedirs(workdir, exist_ok=True)
    out_path = os.path.join(workdir, f"{scene.scene_id}_proc.tif")

    with rasterio.open(scene.assets["multiband"]) as src:
        # Clip to the project polygon.
        geoms = [{"type": "Polygon", "coordinates": boundary_geojson["coordinates"]}]
        clipped, clipped_transform = mask(src, geoms, crop=True, all_touched=True)
        # Reproject to Web Mercator for broad map compatibility if needed.
        dst_crs = "EPSG:4326"
        transform, width, height = calculate_default_transform(
            src.crs, dst_crs, src.width, src.height, *src.bounds
        )
        profile = src.profile
        profile.update({"crs": dst_crs, "transform": transform, "width": width, "height": height})

        with rasterio.open(out_path, "w", **profile) as dst:
            for b in range(1, src.count + 1):
                reproject(
                    source=rasterio.band(src, b),
                    destination=rasterio.band(dst, b),
                    src_transform=clipped_transform,
                    src_crs=src.crs,
                    dst_transform=transform,
                    dst_crs=dst_crs,
                    resampling=Resampling.nearest,
                )
            # Compute NDVI from band 4 (NIR) / band 1 (Red) if present.
            if src.count >= 4:
                nir = clipped[3].astype("float32")
                red = clipped[0].astype("float32")
                denom = nir + red
                ndvi = (nir - red) / (denom + 1e-6)
                ndvi_profile = profile.copy()
                ndvi_profile.update({"count": 1, "dtype": "float32", "nodata": -9999})
                with rasterio.open(out_path.replace(".tif", "_ndvi.tif"), "w", **ndvi_profile) as nd:
                    nd.write(ndvi, 1)

    raster_key = f"{bucket}/{scene.scene_id}_proc.tif"
    return ProcessedScene(
        scene_id=scene.scene_id,
        acquired_at=scene.acquired_at,
        source=scene.source,
        raster_key=raster_key,
        local_path=out_path,
    )
