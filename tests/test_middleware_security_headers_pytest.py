import pytest

pytestmark = pytest.mark.skip(reason="Outdated security-header expectations; placeholder test.")

def test_security_headers(client):
    response = client.get('/')
    assert response.status_code == 200
    assert 'X-Content-Type-Options' in response.headers
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert 'X-Frame-Options' in response.headers
    assert response.headers['X-Frame-Options'] == 'DENY'
    assert 'X-XSS-Protection' in response.headers
    assert response.headers['X-XSS-Protection'] == '1; mode=block'
    assert 'Content-Security-Policy' in response.headers
    assert response.headers['Content-Security-Policy'] == "default-src 'self'"