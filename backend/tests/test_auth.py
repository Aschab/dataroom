import json
from app.models.user import User
from app import db


def test_register_success(client, app):
    """Test successful user registration"""
    response = client.post('/api/auth/register',
        data=json.dumps({
            'email': 'newuser@example.com',
            'name': 'New User',
            'password': 'password123'
        }),
        content_type='application/json'
    )

    assert response.status_code == 201
    data = json.loads(response.data)
    assert 'token' in data
    assert data['user']['email'] == 'newuser@example.com'
    assert data['user']['name'] == 'New User'
    assert 'password_hash' not in data['user']


def test_register_duplicate_email(client, app):
    """Test registration with duplicate email fails"""
    with app.app_context():
        user = User(email='existing@example.com', name='Existing User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/auth/register',
        data=json.dumps({
            'email': 'existing@example.com',
            'name': 'New User',
            'password': 'password123'
        }),
        content_type='application/json'
    )

    assert response.status_code == 409


def test_register_short_password(client, app):
    """Test registration with short password fails"""
    response = client.post('/api/auth/register',
        data=json.dumps({
            'email': 'test@example.com',
            'name': 'Test User',
            'password': '12345'
        }),
        content_type='application/json'
    )

    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'password' in data['error'].lower()


def test_login_success(client, app):
    """Test successful login"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/auth/login',
        data=json.dumps({
            'email': 'test@example.com',
            'password': 'password123'
        }),
        content_type='application/json'
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'token' in data
    assert data['user']['email'] == 'test@example.com'


def test_login_wrong_password(client, app):
    """Test login with wrong password fails"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

    response = client.post('/api/auth/login',
        data=json.dumps({
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }),
        content_type='application/json'
    )

    assert response.status_code == 401


def test_login_nonexistent_user(client, app):
    """Test login with non-existent user fails"""
    response = client.post('/api/auth/login',
        data=json.dumps({
            'email': 'nonexistent@example.com',
            'password': 'password123'
        }),
        content_type='application/json'
    )

    assert response.status_code == 401


def test_get_current_user_authenticated(client, app):
    """Test getting current user info when authenticated"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

    # Login to get token
    login_response = client.post('/api/auth/login',
        data=json.dumps({
            'email': 'test@example.com',
            'password': 'password123'
        }),
        content_type='application/json'
    )
    token = json.loads(login_response.data)['token']

    # Get current user
    response = client.get('/api/auth/me',
        headers={'Authorization': f'Bearer {token}'}
    )

    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['user']['email'] == 'test@example.com'


def test_get_current_user_unauthenticated(client, app):
    """Test getting current user info without authentication"""
    response = client.get('/api/auth/me')

    assert response.status_code == 401
