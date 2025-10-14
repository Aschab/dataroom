from functools import wraps
from flask import request, jsonify
from app.utils.jwt_helper import decode_token
from app.models.user import User

def get_current_user():
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None

    token = auth_header.split(' ')[1]
    user_id = decode_token(token)

    if not user_id:
        return None

    return User.query.get(user_id)

def require_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        return f(user, *args, **kwargs)
    return decorated_function

def require_admin(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Authentication required'}), 401
        if user.role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return f(user, *args, **kwargs)
    return decorated_function

def optional_auth(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = get_current_user()
        return f(user, *args, **kwargs)
    return decorated_function
