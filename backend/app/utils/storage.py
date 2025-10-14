import os
import uuid
from datetime import datetime
from flask import current_app
from werkzeug.utils import secure_filename

def get_file_extension(filename):
    return os.path.splitext(filename)[1].lower()

def is_allowed_file(filename):
    ext = get_file_extension(filename)
    return ext in ['.pdf']

def generate_unique_filename(original_filename):
    ext = get_file_extension(original_filename)
    unique_name = f"{uuid.uuid4().hex}{ext}"
    return unique_name

def get_storage_path(filename):
    now = datetime.utcnow()
    date_path = os.path.join(str(now.year), f"{now.month:02d}", f"{now.day:02d}")

    full_path = os.path.join(
        current_app.config['FILE_STORAGE_PATH'],
        date_path
    )

    os.makedirs(full_path, exist_ok=True)

    return os.path.join(date_path, filename)

def save_file(file_storage):
    if not file_storage:
        raise ValueError('No file provided')

    if not is_allowed_file(file_storage.filename):
        raise ValueError('Only PDF files are allowed')

    original_filename = secure_filename(file_storage.filename)
    unique_filename = generate_unique_filename(original_filename)
    storage_path = get_storage_path(unique_filename)

    full_path = os.path.join(current_app.config['FILE_STORAGE_PATH'], storage_path)

    file_storage.save(full_path)

    return storage_path, original_filename

def delete_file(storage_path):
    full_path = os.path.join(current_app.config['FILE_STORAGE_PATH'], storage_path)

    if os.path.exists(full_path):
        os.remove(full_path)
        return True

    return False

def get_file_path(storage_path):
    return os.path.join(current_app.config['FILE_STORAGE_PATH'], storage_path)
