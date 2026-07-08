"""
Satellite data providers (Phase 1 — Satellite Data Integration).

A provider retrieves scenes intersecting a project boundary. The default
`MockProvider` synthesizes rasters locally so the pipeline is fully testable
offline on the M2 profile. `STACProvider` performs real retrieval against a
public STAC API (e.g. Element84 Earth Search) when network access is available.
"""
from __future__ import annotations

import os
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import date, timedelta


@dataclass
class Scene:
    scene_id: str
    acquired_at: str  # ISO date (YYYY-MM-DD)
    source: str
    # Band name -> local file path (mock) or remote asset href (STAC).
    assets: dict[str, str] = field(default_factory=dict)


class SatelliteProvider(ABC):
    @abstractmethod
    def retrieve(self, boundary_geojson: dict, count: int = 2) -> list[Scene]:
        """Return up to `count` scenes intersecting the boundary."""


def _bbox_of(boundary_geojson: dict) -> tuple[float, float, float, float]:
    coords = boundary_geojson["coordinates"][0]
    xs = [c[0] for c in coords]
    ys = [c[1] for c in coords]
    return min(xs), min(ys), max(xs), max(ys)


class MockProvider(SatelliteProvider):
    """Synthesizes multi-band rasters (RGB + NIR) for offline testing."""

    def __init__(self, workdir: str = "/tmp/projectwatch/scenes", seed_bands: bool = True):
        self.workdir = workdir
        os.makedirs(workdir, exist_ok=True)

    def retrieve(self, boundary_geojson: dict, count: int = 2) -> list[Scene]:
        import numpy as np
        import rasterio
        from rasterio.transform import from_bounds

        minx, miny, maxx, maxy = _bbox_of(boundary_geojson)
        width = height = 128
        transform = from_bounds(minx, miny, maxx, maxy, width, height)
        bands = {"red": 0.25, "green": 0.35, "blue": 0.20, "nir": 0.55}
        scenes: list[Scene] = []
        base = date.today() - timedelta(days=30)
        for i in range(count):
            scene_id = f"MOCK_S2_{base + timedelta(days=i * 12):%Y%m%d}_{i}"
            path = os.path.join(self.workdir, f"{scene_id}.tif")
            profile = {
                "driver": "GTiff",
                "height": height,
                "width": width,
                "count": len(bands),
                "dtype": "float32",
                "crs": "EPSG:4326",
                "transform": transform,
            }
            with rasterio.open(path, "w", **profile) as dst:
                for b, val in enumerate(bands.values(), start=1):
                    arr = np.full((height, width), float(val + 0.05 * i), dtype="float32")
                    dst.write(arr, b)
            scenes.append(
                Scene(
                    scene_id=scene_id,
                    acquired_at=(base + timedelta(days=i * 12)).isoformat(),
                    source="mock-sentinel-2",
                    assets={"multiband": path},
                )
            )
        return scenes


class STACProvider(SatelliteProvider):
    """Real retrieval from a STAC API (default: Element84 Earth Search)."""

    def __init__(self, api_url: str = "https://earth-search.aws.element84.com/v1", collections: str = "sentinel-2-l2a"):
        self.api_url = api_url.rstrip("/")
        self.collections = collections

    def retrieve(self, boundary_geojson: dict, count: int = 2) -> list[Scene]:
        import requests

        minx, miny, maxx, maxy = _bbox_of(boundary_geojson)
        body = {
            "collections": [self.collections],
            "bbox": [[minx, miny, maxx, maxy]],
            "datetime": f"{(date.today() - timedelta(days=180)).isoformat()}/{date.today().isoformat()}",
            "limit": count,
            "query": {"eo:cloud_cover": {"lt": 30}},
        }
        r = requests.post(f"{self.api_url}/search", json=body, timeout=30)
        r.raise_for_status()
        scenes: list[Scene] = []
        for feat in r.json().get("features", [])[:count]:
            props = feat.get("properties", {})
            assets = {k: a["href"] for k, a in feat.get("assets", {}).items()}
            scenes.append(
                Scene(
                    scene_id=feat["id"],
                    acquired_at=str(props.get("datetime", ""))[:10],
                    source="sentinel-2",
                    assets=assets,
                )
            )
        return scenes
