"""
Experience snapshot route — serves a single JSON payload describing
the platform's live state (routes, services, guard rails) for the dashboard.
"""

import os

from flask import Blueprint, current_app

from src.api.response import success_response
from src.application.use_cases.experience_snapshot import build_experience_snapshot
from src.config import AppSettings

experience_bp = Blueprint("experience", __name__)


def _static_index_present() -> bool:
    static_folder = current_app.static_folder
    if not static_folder:
        return False
    return os.path.exists(os.path.join(static_folder, "index.html"))


@experience_bp.get("/api/experience/snapshot")
def experience_snapshot():
    """Return a full platform snapshot for the command center UI."""
    snapshot = build_experience_snapshot(
        current_app.url_map,
        settings=AppSettings.from_env(),
        static_index_present=_static_index_present(),
    )
    return success_response(snapshot)
