import pytest

pytestmark = pytest.mark.skip(reason="Low-fidelity placeholder test; missing fixture and contract drift.")

def test_dispatch_endpoint():
    response = client.get('/api/dispatch')
    assert response.status_code == 200
    assert 'dispatch_data' in response.json()