import pytest

pytestmark = pytest.mark.skip(reason="Low-fidelity placeholder test; guessed endpoint/policy behavior.")

def test_rate_limiting(client):
    response = client.get('/api/some_endpoint')
    assert response.status_code == 200

    for _ in range(10):
        response = client.get('/api/some_endpoint')
    
    assert response.status_code == 429
    assert response.json() == {'error': 'Too Many Requests'}