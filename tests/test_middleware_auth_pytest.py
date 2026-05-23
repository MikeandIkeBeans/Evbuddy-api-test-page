import pytest

pytestmark = pytest.mark.skip(reason="Low-fidelity placeholder test; uses nonexistent probe route.")

def test_auth_middleware_valid_token(client):
    response = client.get('/protected-route', headers={'Authorization': 'Bearer valid_token'})
    assert response.status_code == 200

def test_auth_middleware_invalid_token(client):
    response = client.get('/protected-route', headers={'Authorization': 'Bearer invalid_token'})
    assert response.status_code == 401

def test_auth_middleware_missing_token(client):
    response = client.get('/protected-route')
    assert response.status_code == 401

def test_auth_middleware_expired_token(client):
    response = client.get('/protected-route', headers={'Authorization': 'Bearer expired_token'})
    assert response.status_code == 401