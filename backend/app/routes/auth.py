from flask import Blueprint, request, jsonify
from datetime import datetime
from app import db
from app.models.user import User
from app.utils.jwt_helper import generate_token
from app.utils.decorators import require_auth

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/health', methods=['GET'])
def health():
    return {'status': 'ok'}, 200

@bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    name = data.get('name', '').strip()
    password = data.get('password', '')

    if not email or not name or not password:
        return jsonify({'error': 'Email, name, and password are required'}), 400

    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 409

    user = User(email=email, name=name)
    user.set_password(password)

    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)

    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'error': 'Email and password are required'}), 400

    user = User.query.filter_by(email=email).first()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid email or password'}), 401

    user.last_login = datetime.utcnow()
    db.session.commit()

    token = generate_token(user.id)

    return jsonify({
        'token': token,
        'user': user.to_dict()
    }), 200

@bp.route('/me', methods=['GET'])
@require_auth
def get_me(user):
    return jsonify({'user': user.to_dict()}), 200
