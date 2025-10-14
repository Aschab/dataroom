import json
from app.models.user import User
from app.models.folder import Folder
from app import db


def create_user_and_login(client, app, email='test@example.com', name='Test User', password='password123'):
    """Helper function to create a user and get auth token"""
    with app.app_context():
        user = User(email=email, name=name)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/auth/login',
        data=json.dumps({'email': email, 'password': password}),
        content_type='application/json'
    )
    return json.loads(response.data)['token']


def test_create_folder(client, app):
    """Test creating a folder"""
    token = create_user_and_login(client, app)

    response = client.post('/api/folders',
        data=json.dumps({'name': 'Test Folder'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert data['folder']['name'] == 'Test Folder'
    assert data['folder']['parent_id'] is None


def test_create_folder_unauthenticated(client, app):
    """Test creating folder without authentication fails"""
    response = client.post('/api/folders',
        data=json.dumps({'name': 'Test Folder'}),
        content_type='application/json'
    )

    assert response.status_code == 401


def test_list_folders(client, app):
    """Test listing folders"""
    token = create_user_and_login(client, app)

    # Create a folder
    client.post('/api/folders',
        data=json.dumps({'name': 'Folder 1'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )

    # List folders (anyone can view)
    response = client.get('/api/folders')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data['folders']) == 1
    assert data['folders'][0]['name'] == 'Folder 1'


def test_get_folder_details(client, app):
    """Test getting folder details with contents"""
    token = create_user_and_login(client, app)

    # Create parent folder
    response = client.post('/api/folders',
        data=json.dumps({'name': 'Parent'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )
    parent_id = json.loads(response.data)['folder']['id']

    # Create child folder
    client.post('/api/folders',
        data=json.dumps({'name': 'Child', 'parent_id': parent_id}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )

    # Get folder details
    response = client.get(f'/api/folders/{parent_id}')

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['folder']['name'] == 'Parent'
    assert len(data['subfolders']) == 1
    assert data['subfolders'][0]['name'] == 'Child'


def test_rename_folder(client, app):
    """Test renaming a folder"""
    token = create_user_and_login(client, app)

    # Create folder
    response = client.post('/api/folders',
        data=json.dumps({'name': 'Old Name'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )
    folder_id = json.loads(response.data)['folder']['id']

    # Rename folder
    response = client.put(f'/api/folders/{folder_id}',
        data=json.dumps({'name': 'New Name'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['folder']['name'] == 'New Name'


def test_delete_folder(client, app):
    """Test deleting a folder"""
    token = create_user_and_login(client, app)

    # Create folder
    response = client.post('/api/folders',
        data=json.dumps({'name': 'To Delete'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token}'}
    )
    folder_id = json.loads(response.data)['folder']['id']

    # Delete folder
    response = client.delete(f'/api/folders/{folder_id}',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200

    # Verify deletion
    response = client.get(f'/api/folders/{folder_id}')
    assert response.status_code == 404


def test_cannot_delete_others_folder(client, app):
    """Test that users cannot delete folders owned by others"""
    token1 = create_user_and_login(client, app, email='user1@example.com')
    token2 = create_user_and_login(client, app, email='user2@example.com', name='User 2')

    # User 1 creates folder
    response = client.post('/api/folders',
        data=json.dumps({'name': 'User 1 Folder'}),
        content_type='application/json',
        headers={'Authorization': f'Bearer {token1}'}
    )
    folder_id = json.loads(response.data)['folder']['id']

    # User 2 tries to delete it
    response = client.delete(f'/api/folders/{folder_id}',
        headers={'Authorization': f'Bearer {token2}'}
    )

    assert response.status_code == 403
