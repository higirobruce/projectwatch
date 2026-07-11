"""
Scheduler service (Phase 3 — Pilot).

Periodically triggers analysis for all projects that have ingested scenes.
Runs on a configurable interval (default: every 6 hours).
"""
from __future__ import annotations

import os
import sys
import time

import requests

API_URL = os.environ.get("API_URL", "http://localhost:4000").rstrip("/")
POLL_INTERVAL = int(os.environ.get("SCHEDULE_INTERVAL", "21600"))  # 6 hours


def run() -> None:
    print(f"[scheduler] monitoring {API_URL}/api/projects (interval={POLL_INTERVAL}s)")
    while True:
        try:
            resp = requests.get(f"{API_URL}/api/projects", timeout=30)
            resp.raise_for_status()
            projects = resp.json().get("projects", [])
        except requests.RequestException as e:
            print(f"[scheduler] poll error: {e}", file=sys.stderr)
            time.sleep(POLL_INTERVAL)
            continue

        for project in projects:
            pid = project["id"]
            try:
                ing_resp = requests.get(f"{API_URL}/api/projects/{pid}/ingestions", timeout=30)
                ing_resp.raise_for_status()
                ingestions = ing_resp.json().get("ingestions", [])
                done = [i for i in ingestions if i.get("status") == "done"]
                if not done:
                    continue

                resp = requests.post(
                    f"{API_URL}/api/projects/{pid}/analyze",
                    json={"projectId": pid},
                    timeout=30,
                )
                if resp.status_code == 202:
                    result = resp.json()
                    print(f"[scheduler] triggered analysis {result.get('id')} for project {pid}")
                else:
                    print(f"[scheduler] analyze failed for {pid}: {resp.status_code} {resp.text[:200]}")
            except requests.RequestException as e:
                print(f"[scheduler] project {pid} error: {e}", file=sys.stderr)

        time.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    run()
