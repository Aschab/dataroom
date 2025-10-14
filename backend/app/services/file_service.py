from app import db
from app.models.file import File
from app.models.folder import Folder
from app.utils.storage import save_file, delete_file

def upload_file(file_storage, name, owner_id, folder_id=None):
    if folder_id:
        folder = Folder.query.get(folder_id)
        if not folder:
            raise ValueError('Folder not found')
        if folder.owner_id != owner_id:
            raise PermissionError('You can only upload files to your own folders')

    existing = File.query.filter_by(
        name=name,
        owner_id=owner_id,
        folder_id=folder_id
    ).first()

    if existing:
        raise ValueError('A file with this name already exists in this location')

    storage_path, original_filename = save_file(file_storage)

    file_obj = File(
        name=name,
        original_filename=original_filename,
        storage_path=storage_path,
        size_bytes=0,
        mime_type='application/pdf',
        folder_id=folder_id,
        owner_id=owner_id
    )

    import os
    from flask import current_app
    full_path = os.path.join(current_app.config['FILE_STORAGE_PATH'], storage_path)
    file_obj.size_bytes = os.path.getsize(full_path)

    db.session.add(file_obj)
    db.session.commit()

    return file_obj

def get_file_by_id(file_id):
    return File.query.get(file_id)

def delete_file_by_id(file_id, user_id):
    file_obj = File.query.get(file_id)

    if not file_obj:
        return False

    if file_obj.owner_id != user_id:
        raise PermissionError('You do not have permission to delete this file')

    delete_file(file_obj.storage_path)

    db.session.delete(file_obj)
    db.session.commit()

    return True

def check_file_ownership(file_id, user_id):
    file_obj = File.query.get(file_id)
    if not file_obj:
        return False
    return file_obj.owner_id == user_id
