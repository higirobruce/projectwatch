"""
Change-detection engine (Phase 2 — Intelligence Layer).

Produces a change score, progress %, risk classification, and confidence for
a project by comparing its ingested scenes. The MVP uses a mock engine that
returns simulated-but-realistic values. In production this would run CV models
over raster pairs (e.g. Sentinel-2 before/after).
"""
from __future__ import annotations

import random
import math


def analyze_project(project: dict, scenes: list[dict]) -> dict:
    """
    Run change detection over a project's ingested scenes.

    Returns a dict matching the analysis patch schema:
      changeScore, confidence, progressPct, risk, reason, scenesCompared
    """
    scene_ids = [s["sceneId"] for s in scenes]
    scene_count = len(scenes)

    # Simulated change detection — replace with real CV pipeline.
    if scene_count < 2:
        return {
            "changeScore": 0.0,
            "confidence": 0.0,
            "progressPct": _estimate_progress(project),
            "risk": "amber",
            "reason": "Insufficient scenes for change comparison; using schedule-only estimate.",
            "scenesCompared": scene_ids,
        }

    change_score = _simulate_change_score(scene_count)
    confidence = _simulate_confidence(scene_count, change_score)
    progress_pct = _estimate_progress(project)
    risk = _classify_risk(change_score, progress_pct)

    return {
        "changeScore": round(change_score, 4),
        "confidence": round(confidence, 4),
        "progressPct": round(progress_pct, 1),
        "risk": risk,
        "reason": _risk_reason(risk, change_score, progress_pct),
        "scenesCompared": scene_ids,
    }


def _simulate_change_score(scene_count: int) -> float:
    """
    Simulate a change score (0..1) based on scene count.
    More scenes = more information = more confident detection.
    """
    base = random.uniform(0.05, 0.45)
    boost = min(scene_count * 0.03, 0.3)
    return min(base + boost + random.gauss(0, 0.05), 1.0)


def _simulate_confidence(scene_count: int, change_score: float) -> float:
    """Confidence rises with scene count and is tempered by extreme scores."""
    base = min(scene_count * 0.15, 0.7)
    score_penalty = abs(change_score - 0.5) * 0.2  # less confident near extremes
    return max(min(base - score_penalty + random.gauss(0, 0.03), 0.99), 0.1)


def _estimate_progress(project: dict) -> float:
    """
    Estimate schedule progress from milestones.
    Fallback: random value between 10 and 90.
    """
    milestones = project.get("milestones", [])
    if not milestones:
        return random.uniform(10, 90)

    done = sum(1 for m in milestones if m.get("status") == "done")
    return (done / len(milestones)) * 100.0


def _classify_risk(change_score: float, progress_pct: float) -> str:
    """
    Risk classification matrix:

                 | low change | high change
    --------- ---+------------+------------
    on schedule   | green      | amber
    behind        | amber      | red
    """
    behind = progress_pct < 30
    high_change = change_score > 0.25

    if behind and high_change:
        return "red"
    if behind or high_change:
        return "amber"
    return "green"


def _risk_reason(risk: str, change_score: float, progress_pct: float) -> str:
    reasons = {
        "green": f"On track. Change score {change_score:.0%} within expected range at {progress_pct:.0f}% schedule progress.",
        "amber": f"Caution. Change score {change_score:.0%} with schedule at {progress_pct:.0f}% — monitor closely.",
        "red": f"At risk. Significant change ({change_score:.0%}) combined with lagging schedule ({progress_pct:.0f}%). Intervention recommended.",
    }
    return reasons[risk]
