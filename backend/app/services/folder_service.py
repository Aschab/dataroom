from app import db
from app.models.folder import Folder
from app.models.file import File
from sqlalchemy import or_
from sqlalchemy.orm import joinedload

def create_folder(name, owner_id, parent_id=None):
    existing = Folder.query.filter_by(
        name=name,
        owner_id=owner_id,
        parent_id=parent_id
    ).first()

    if existing:
        raise ValueError('A folder with this name already exists in this location')

    folder = Folder(name=name, owner_id=owner_id, parent_id=parent_id)
    db.session.add(folder)
    db.session.commit()

    return folder

def get_folder_by_id(folder_id):
    return Folder.query.get(folder_id)

def get_root_folders(owner_id=None, limit=100, offset=0):
    query = Folder.query.options(joinedload(Folder.owner)).filter_by(parent_id=None)

    if owner_id:
        query = query.filter_by(owner_id=owner_id)

    return query.order_by(Folder.created_at.desc()).limit(limit).offset(offset).all()

def get_folder_contents(folder_id):
    folder = Folder.query.options(joinedload(Folder.owner)).get(folder_id)
    if not folder:
        return None

    subfolders = Folder.query.options(joinedload(Folder.owner)).filter_by(parent_id=folder_id).order_by(Folder.name).all()
    files = File.query.options(joinedload(File.owner)).filter_by(folder_id=folder_id).order_by(File.name).all()

    return {
        'folder': folder,
        'subfolders': subfolders,
        'files': files
    }

def update_folder(folder_id, name, user_id):
    folder = Folder.query.get(folder_id)

    if not folder:
        return None

    if folder.owner_id != user_id:
        raise PermissionError('You do not have permission to edit this folder')

    existing = Folder.query.filter_by(
        name=name,
        owner_id=folder.owner_id,
        parent_id=folder.parent_id
    ).filter(Folder.id != folder_id).first()

    if existing:
        raise ValueError('A folder with this name already exists in this location')

    folder.name = name
    db.session.commit()

    return folder

def delete_folder(folder_id, user_id):
    folder = Folder.query.get(folder_id)

    if not folder:
        return False

    if folder.owner_id != user_id:
        raise PermissionError('You do not have permission to delete this folder')

    db.session.delete(folder)
    db.session.commit()

    return True

def check_folder_ownership(folder_id, user_id):
    folder = Folder.query.get(folder_id)
    if not folder:
        return False
    return folder.owner_id == user_id
