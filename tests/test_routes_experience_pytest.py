from __future__ import annotations


def test_experience_snapshot_envelope(client):
    response = client.get("/api/experience/snapshot")
    assert response.status_code == 200

    payload = response.get_json()
    assert payload["ok"] is True
    assert isinstance(payload["data"], dict)


def test_experience_snapshot_reports_static_index_presence(client, monkeypatch):
    monkeypatch.setattr("routes.experience._static_index_present", lambda: True)

    response = client.get("/api/experience/snapshot")
    assert response.status_code == 200
    payload = response.get_json()

    # Verify expected, stable dashboard metadata shape.
    assert payload["ok"] is True
    assert "data" in payload
    assert "generatedAt" in payload["data"]
    assert "routeAtlas" in payload["data"]
