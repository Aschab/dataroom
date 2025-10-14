from flask import Blueprint

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/health', methods=['GET'])
def health():
    return {'status': 'ok'}, 200
