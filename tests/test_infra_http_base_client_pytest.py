import pytest

pytestmark = pytest.mark.skip(reason="Low-fidelity placeholder test; external network dependency.")

def test_http_base_client():
    response = requests.get('http://example.com')
    assert response.status_code == 200
    assert 'Example Domain' in response.text