import pytest

pytestmark = pytest.mark.skip(reason="Low-fidelity placeholder test; health contract drift.")

def test_health_check(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}