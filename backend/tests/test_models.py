import pytest
from datetime import datetime
from app.models.user import User
from app.models.folder import Folder
from app.models.file import File
from app import db


def test_user_password_hashing(app):
    """Test that user passwords are properly hashed and verified"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')

        assert user.password_hash is not None
        assert user.password_hash != 'password123'
        assert user.check_password('password123') is True
        assert user.check_password('wrongpassword') is False


def test_user_to_dict_timestamps(app):
    """Test that user timestamps include 'Z' for UTC"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

        user_dict = user.to_dict()
        assert user_dict['created_at'].endswith('Z')
        assert 'password_hash' not in user_dict


def test_folder_to_dict_timestamps(app):
    """Test that folder timestamps include 'Z' for UTC"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

        folder = Folder(name='Test Folder', owner_id=user.id)
        db.session.add(folder)
        db.session.commit()

        folder_dict = folder.to_dict()
        assert folder_dict['created_at'].endswith('Z')
        assert folder_dict['updated_at'].endswith('Z')
        assert folder_dict['owner_name'] == 'Test User'


def test_folder_cascade_delete(app):
    """Test that deleting a folder cascades to subfolders"""
    with app.app_context():
        user = User(email='test@example.com', name='Test User')
        user.set_password('password123')
        db.session.add(user)
        db.session.commit()

        parent = Folder(name='Parent', owner_id=user.id)
        db.session.add(parent)
        db.session.commit()

        child = Folder(name='Child', parent_id=parent.id, owner_id=user.id)
        db.session.add(child)
        db.session.commit()

        parent_id = parent.id
        child_id = child.id

        db.session.delete(parent)
        db.session.commit()

        assert Folder.query.get(parent_id) is None
        assert Folder.query.get(child_id) is None
