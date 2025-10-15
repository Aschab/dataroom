from flask import Blueprint, request, jsonify
from app.models.folder import Folder
from app.models.file import File
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

bp = Blueprint('search', __name__, url_prefix='/api/search')

@bp.route('', methods=['GET'])
def search():
    query = request.args.get('q', '').strip()
    limit = min(int(request.args.get('limit', 50)), 500)
    offset = int(request.args.get('offset', 0))

    if not query or len(query) < 2:
        return jsonify({'error': 'Search query must be at least 2 characters'}), 400

    search_pattern = f'%{query}%'

    folders = Folder.query.options(joinedload(Folder.owner)).filter(
        Folder.name.ilike(search_pattern)
    ).order_by(Folder.name).limit(limit).offset(offset).all()

    files = File.query.options(joinedload(File.owner)).filter(
        or_(
            File.name.ilike(search_pattern),
            File.original_filename.ilike(search_pattern)
        )
    ).order_by(File.name).limit(limit).offset(offset).all()

    return jsonify({
        'query': query,
        'folders': [f.to_dict() for f in folders],
        'files': [f.to_dict() for f in files],
        'limit': limit,
        'offset': offset
    }), 200
