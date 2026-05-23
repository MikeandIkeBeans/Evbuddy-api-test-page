import pytest

pytestmark = pytest.mark.skip(reason="Low-fidelity placeholder test; fixture and contract assumptions.")

def test_user_client_interaction():
    response = client.get('/api/users')
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    new_user = {"name": "Test User", "email": "test@example.com"}
    response = client.post('/api/users', json=new_user)
    assert response.status_code == 201
    assert response.json()['name'] == new_user['name']

    user_id = response.json()['id']
    response = client.get(f'/api/users/{user_id}')
    assert response.status_code == 200
    assert response.json()['id'] == user_id

    updated_user = {"name": "Updated User"}
    response = client.put(f'/api/users/{user_id}', json=updated_user)
    assert response.status_code == 200
    assert response.json()['name'] == updated_user['name']

    response = client.delete(f'/api/users/{user_id}')
    assert response.status_code == 204

    response = client.get(f'/api/users/{user_id}')
    assert response.status_code == 404