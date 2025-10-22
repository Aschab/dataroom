from flask import Blueprint, request, jsonify
from app.utils.decorators import require_auth, optional_auth
from app.services import folder_service, file_service

bp = Blueprint('folders', __name__, url_prefix='/api/folders')

@bp.route('', methods=['GET'])
@optional_auth
def list_folders(user):
    owned_only = request.args.get('owned', 'false').lower() == 'true'
    limit = min(int(request.args.get('limit', 100)), 1000)
    offset = int(request.args.get('offset', 0))

    if owned_only and not user:
        return jsonify({'error': 'Authentication required for owned filter'}), 401

    owner_id = user.id if owned_only and user else None
    folders = folder_service.get_root_folders(owner_id=owner_id, limit=limit, offset=offset)
    files = file_service.get_root_files(owner_id=owner_id, limit=limit, offset=offset)

    return jsonify({
        'folders': [f.to_dict() for f in folders],
        'files': [f.to_dict() for f in files],
        'limit': limit,
        'offset': offset
    }), 200

@bp.route('/<int:folder_id>', methods=['GET'])
def get_folder(folder_id):
    result = folder_service.get_folder_contents(folder_id)

    if not result:
        return jsonify({'error': 'Folder not found'}), 404

    return jsonify({
        'folder': result['folder'].to_dict(),
        'subfolders': [f.to_dict() for f in result['subfolders']],
        'files': [f.to_dict() for f in result['files']]
    }), 200

@bp.route('', methods=['POST'])
@require_auth
def create_folder(user):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()
    parent_id = data.get('parent_id')

    if not name:
        return jsonify({'error': 'Folder name is required'}), 400

    if parent_id and not folder_service.check_folder_ownership(parent_id, user.id):
        return jsonify({'error': 'You can only create subfolders in your own folders'}), 403

    try:
        folder = folder_service.create_folder(name, user.id, parent_id)
        return jsonify({'folder': folder.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

@bp.route('/<int:folder_id>', methods=['PUT'])
@require_auth
def update_folder(user, folder_id):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'Folder name is required'}), 400

    try:
        folder = folder_service.update_folder(folder_id, name, user.id)
        if not folder:
            return jsonify({'error': 'Folder not found'}), 404
        return jsonify({'folder': folder.to_dict()}), 200
    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

@bp.route('/<int:folder_id>', methods=['DELETE'])
@require_auth
def delete_folder(user, folder_id):
    try:
        success = folder_service.delete_folder(folder_id, user.id)
        if not success:
            return jsonify({'error': 'Folder not found'}), 404
        return jsonify({'message': 'Folder deleted successfully'}), 200
    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
