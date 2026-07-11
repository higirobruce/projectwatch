"""
Intelligence worker (Phase 2 — Intelligence Layer).

Polls the ProjectWatch API for pending analysis jobs, runs the change-detection
engine on each project's ingested scenes, and reports results back to the API.

Run with:  python worker.py  (inside the intelligence container)
"""
from __future__ import annotations

import os
import sys
import time

import requests

API_URL = os.environ.get("API_URL", "http://localhost:4000").rstrip("/")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "15"))
ALERT_WEBHOOK_URL = os.environ.get("ALERT_WEBHOOK_URL", "")


def _patch(analysis_id: str, payload: dict) -> None:
    requests.patch(f"{API_URL}/api/analyses/{analysis_id}", json=payload, timeout=30).raise_for_status()


def process_job(job: dict) -> None:
    from engine import analyze_project

    analysis_id = job["id"]
    project_id = job["projectId"]

    _patch(analysis_id, {"status": "processing"})

    project = requests.get(f"{API_URL}/api/projects/{project_id}", timeout=30).json()
    ingest_resp = requests.get(f"{API_URL}/api/projects/{project_id}/ingestions", timeout=30).json()
    ingestions = ingest_resp.get("ingestions", [])
    scenes = []
    for ing in ingestions:
        scenes.extend(ing.get("scenes", []))

    result = analyze_project(project, scenes)
    result["status"] = "done"
    _patch(analysis_id, result)

    risk = result.get("risk", "")
    print(
        f"[intel] analysis {analysis_id}: "
        f"change={result.get('changeScore'):.0%} "
        f"confidence={result.get('confidence'):.0%} "
        f"risk={risk} "
        f"progress={result.get('progressPct'):.0f}%"
    )

    if risk in ("amber", "red") and ALERT_WEBHOOK_URL:
        _send_alert(project, analysis_id, result)


def _send_alert(project: dict, analysis_id: str, result: dict) -> None:
    """POST an alert payload to the configured webhook URL."""
    try:
        payload = {
            "event": "risk_alert",
            "project": {"id": project.get("id"), "name": project.get("name")},
            "analysis": {
                "id": analysis_id,
                "changeScore": result.get("changeScore"),
                "confidence": result.get("confidence"),
                "progressPct": result.get("progressPct"),
                "risk": result.get("risk"),
                "reason": result.get("reason"),
            },
            "message": f"[ProjectWatch] {project.get('name')} — risk is {result.get('risk').upper()}. {result.get('reason', '')}",
        }
        r = requests.post(ALERT_WEBHOOK_URL, json=payload, timeout=15)
        r.raise_for_status()
        print(f"[intel] alert sent for {analysis_id} (risk={result.get('risk')})")
    except requests.RequestException as e:
        print(f"[intel] alert failed for {analysis_id}: {e}", file=sys.stderr)


def run() -> None:
    print(f"[intel] monitoring {API_URL}/api/analyses/pending (poll={POLL_INTERVAL}s)")
    while True:
        try:
            resp = requests.get(f"{API_URL}/api/analyses/pending", timeout=30)
            resp.raise_for_status()
            jobs = resp.json().get("analyses", [])
        except requests.RequestException as e:
            print(f"[intel] poll error: {e}", file=sys.stderr)
            time.sleep(POLL_INTERVAL)
            continue

        for job in jobs:
            try:
                process_job(job)
            except Exception as e:
                print(f"[intel] job {job['id']} failed: {e}", file=sys.stderr)
                try:
                    _patch(job["id"], {"status": "failed", "error": str(e)[:500]})
                except Exception:
                    pass

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
