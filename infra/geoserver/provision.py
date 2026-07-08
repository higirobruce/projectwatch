"""
ProjectWatch Rwanda — GeoServer provisioning (Phase 1).

Creates the `projectwatch` workspace, a PostGIS datastore pointing at the
`projects` table, and publishes it as an OGC WMS/WFS layer. Run after GeoServer
and PostGIS are healthy (e.g. `python3 infra/geoserver/provision.py`).

Idempotent: existing workspace/datastore/layer are left as-is (409 ignored).
"""
from __future__ import annotations

import os
import sys
import time

import requests

GEOSERVER_URL = os.environ.get("GEOSERVER_URL", "http://localhost:8080/geoserver")
GEOSERVER_USER = os.environ.get("GEOSERVER_USER", "admin")
GEOSERVER_PASSWORD = os.environ.get("GEOSERVER_PASSWORD", "geoserver")

WS = "projectwatch"
STORE = "projectwatch_pg"
LAYER = "projects"

PG_HOST = os.environ.get("PG_HOST", "postgis")
PG_PORT = os.environ.get("PG_PORT", "5432")
PG_DB = os.environ.get("PG_DB", "projectwatch")
PG_USER = os.environ.get("PG_USER", "projectwatch")
PG_PASS = os.environ.get("PG_PASS", "projectwatch")

HEADERS = {"Content-Type": "application/json"}
AUTH = (GEOSERVER_USER, GEOSERVER_PASSWORD)


def _wait_for_geoserver(timeout: int = 120) -> None:
    url = f"{GEOSERVER_URL}/rest/about/version"
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            r = requests.get(url, auth=AUTH, timeout=5)
            if r.status_code == 200:
                print("GeoServer is up.")
                return
        except requests.RequestException:
            pass
        time.sleep(4)
    print("Timed out waiting for GeoServer", file=sys.stderr)
    sys.exit(1)


def _post(path: str, payload: dict) -> bool:
    r = requests.post(f"{GEOSERVER_URL}/rest{path}", json=payload, headers=HEADERS, auth=AUTH, timeout=30)
    if r.status_code in (200, 201, 409):
        return True
    print(f"POST {path} -> {r.status_code}: {r.text[:300]}", file=sys.stderr)
    return False


def provision() -> None:
    _wait_for_geoserver()

    # 1. Workspace
    _post("/workspaces", {"workspace": {"name": WS}})

    # 2. PostGIS datastore
    datastore = {
        "dataStore": {
            "name": STORE,
            "connectionParameters": {
                "entry": [
                    {"@key": "host", "$": PG_HOST},
                    {"@key": "port", "$": PG_PORT},
                    {"@key": "database", "$": PG_DB},
                    {"@key": "user", "$": PG_USER},
                    {"@key": "passwd", "$": PG_PASS},
                    {"@key": "dbtype", "$": "postgis"},
                    {"@key": "schema", "$": "public"},
                    {"@key": "Expose primary keys", "$": "true"},
                ]
            },
        }
    }
    _post(f"/workspaces/{WS}/datastores", datastore)

    # 3. Layer from `projects` table (auto-detected by GeoServer)
    _post(
        f"/workspaces/{WS}/datastores/{STORE}/featuretypes",
        {"featureType": {"name": LAYER, "title": "Project boundaries", "srs": "EPSG:4326"}},
    )

    print(f"GeoServer layer '{WS}:{LAYER}' provisioned at {GEOSERVER_URL}/{WS}/wms")


if __name__ == "__main__":
    provision()
