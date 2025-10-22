from flask import Blueprint, request, jsonify, send_file
from app.utils.decorators import require_auth
from app.services import file_service
from app.utils.storage import get_file_path

bp = Blueprint('files', __name__, url_prefix='/api/files')

@bp.route('', methods=['POST'])
@require_auth
def upload_file(user):
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']

    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    name = request.form.get('name', file.filename).strip()
    folder_id = request.form.get('folder_id')

    if folder_id:
        try:
            folder_id = int(folder_id)
        except ValueError:
            return jsonify({'error': 'Invalid folder_id'}), 400

    try:
        file_obj = file_service.upload_file(file, name, user.id, folder_id)
        return jsonify({'file': file_obj.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except PermissionError as e:
        return jsonify({'error': str(e)}), 403

@bp.route('/<int:file_id>', methods=['GET'])
def get_file(file_id):
    file_obj = file_service.get_file_by_id(file_id)

    if not file_obj:
        return jsonify({'error': 'File not found'}), 404

    return jsonify({'file': file_obj.to_dict()}), 200

@bp.route('/<int:file_id>/download', methods=['GET'])
def download_file(file_id):
    file_obj = file_service.get_file_by_id(file_id)

    if not file_obj:
        return jsonify({'error': 'File not found'}), 404

    file_path = get_file_path(file_obj.storage_path)

    return send_file(
        file_path,
        as_attachment=True,
        download_name=file_obj.original_filename,
        mimetype=file_obj.mime_type
    )

@bp.route('/<int:file_id>/preview', methods=['GET'])
def preview_file(file_id):
    file_obj = file_service.get_file_by_id(file_id)

    if not file_obj:
        return jsonify({'error': 'File not found'}), 404

    file_path = get_file_path(file_obj.storage_path)

    return send_file(
        file_path,
        mimetype=file_obj.mime_type
    )

@bp.route('/<int:file_id>', methods=['PUT'])
@require_auth
def update_file(user, file_id):
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': 'File name is required'}), 400

    try:
        file_obj = file_service.update_file(file_id, name, user.id)
        if not file_obj:
            return jsonify({'error': 'File not found'}), 404
        return jsonify({'file': file_obj.to_dict()}), 200
    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
    except ValueError as e:
        return jsonify({'error': str(e)}), 409

@bp.route('/<int:file_id>', methods=['DELETE'])
@require_auth
def delete_file(user, file_id):
    try:
        success = file_service.delete_file_by_id(file_id, user.id)
        if not success:
            return jsonify({'error': 'File not found'}), 404
        return jsonify({'message': 'File deleted successfully'}), 200
    except PermissionError as e:
        return jsonify({'error': str(e)}), 403
