import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from app.config import Config

db = SQLAlchemy()
migrate = Migrate()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    db.init_app(app)
    migrate.init_app(app, db)

    if app.config.get('FLASK_ENV') == 'development':
        CORS(app, origins='*', supports_credentials=True)
    else:
        CORS(app, origins=[app.config['FRONTEND_URL']], supports_credentials=True)

    os.makedirs(app.config['FILE_STORAGE_PATH'], exist_ok=True)

    with app.app_context():
        from app.routes import auth, folders, files, users, search

        app.register_blueprint(auth.bp)
        app.register_blueprint(folders.bp)
        app.register_blueprint(files.bp)
        app.register_blueprint(users.bp)
        app.register_blueprint(search.bp)

        db.create_all()

    return app
