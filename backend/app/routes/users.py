from flask import Blueprint, request, jsonify
from app import db
from app.models.user import User
from app.utils.decorators import require_admin

bp = Blueprint('users', __name__, url_prefix='/api/users')

@bp.route('', methods=['GET'])
@require_admin
def list_users(user):
    limit = min(int(request.args.get('limit', 100)), 1000)
    offset = int(request.args.get('offset', 0))

    users = User.query.order_by(User.created_at.desc()).limit(limit).offset(offset).all()

    return jsonify({
        'users': [u.to_dict() for u in users],
        'limit': limit,
        'offset': offset
    }), 200

@bp.route('/<int:user_id>', methods=['GET'])
@require_admin
def get_user(user, user_id):
    target_user = User.query.get(user_id)

    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify({'user': target_user.to_dict()}), 200

@bp.route('/<int:user_id>/role', methods=['PUT'])
@require_admin
def update_user_role(user, user_id):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    role = data.get('role', '').strip().lower()

    if role not in ['user', 'admin']:
        return jsonify({'error': 'Role must be either "user" or "admin"'}), 400

    target_user = User.query.get(user_id)

    if not target_user:
        return jsonify({'error': 'User not found'}), 404

    target_user.role = role
    db.session.commit()

    return jsonify({'user': target_user.to_dict()}), 200
