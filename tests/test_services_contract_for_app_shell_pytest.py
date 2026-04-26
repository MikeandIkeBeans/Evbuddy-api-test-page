from __future__ import annotations


def test_services_contract_matches_app_shell_shape(client, monkeypatch):
    class _FakeResponse:
        status_code = 200

        def json(self):
            return {"status": "ok"}

    monkeypatch.setattr("routes.services.http_requests.get", lambda *args, **kwargs: _FakeResponse())

    response = client.get("/api/services")
    assert response.status_code == 200

    payload = response.get_json()
    assert isinstance(payload, dict)

    # App.tsx expects the services contract under payload.data.
    data = payload.get("data")
    assert isinstance(data, dict)

    summary = data.get("summary")
    services = data.get("services")
    assert isinstance(summary, dict)
    assert isinstance(services, dict)

    assert {"total", "available", "unavailable"}.issubset(summary.keys())

    assert len(services) > 0
    first_service = next(iter(services.values()))
    assert isinstance(first_service, dict)
    assert {"port", "base_url", "status_url", "available"}.issubset(first_service.keys())
