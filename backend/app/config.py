import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///dataroom.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    FRONTEND_URL = os.environ.get('FRONTEND_URL') or 'http://localhost:5173'

    FILE_STORAGE_PATH = os.environ.get('FILE_STORAGE_PATH') or './storage'
    MAX_FILE_SIZE_MB = int(os.environ.get('MAX_FILE_SIZE_MB', 100))
    MAX_CONTENT_LENGTH = MAX_FILE_SIZE_MB * 1024 * 1024

    ALLOWED_EXTENSIONS = {'pdf'}

    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
