from __future__ import annotations

import os
from pathlib import Path

import pytest

import routes.cpms as cpms_module
from app import create_app
from config import EV_SESSIONS
from routes.cpms import CPMS_ASSET_COMMANDS, CPMS_TX_LEDGER
from routes.ev_charging import SESSION_REPOSITORY


@pytest.fixture(scope="session")
def stress_enabled() -> bool:
    return os.environ.get("RUN_STRESS", "0").strip().lower() in {"1", "true", "yes", "on"}


@pytest.fixture(autouse=True)
def isolate_runtime_state(tmp_path: Path, monkeypatch: pytest.MonkeyPatch):
    cpms_db = tmp_path / "cpms_test_ledger.db"
    monkeypatch.setattr(cpms_module, "CPMS_DB_PATH", str(cpms_db), raising=False)

    CPMS_TX_LEDGER.clear()
    CPMS_ASSET_COMMANDS.clear()
    EV_SESSIONS.clear()
    SESSION_REPOSITORY._sessions.clear()  # noqa: SLF001 - test-only state reset

    yield


@pytest.fixture()
def app(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("RATE_LIMIT_ENABLED", "false")
    application = create_app()
    application.config["TESTING"] = True
    return application


@pytest.fixture()
def client(app):
    return app.test_client()
