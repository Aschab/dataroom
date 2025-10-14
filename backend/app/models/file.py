from datetime import datetime
from app import db

class File(db.Model):
    __tablename__ = 'files'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    storage_path = db.Column(db.String(512), nullable=False)
    size_bytes = db.Column(db.BigInteger, nullable=False)
    mime_type = db.Column(db.String(100), nullable=False)
    folder_id = db.Column(db.Integer, db.ForeignKey('folders.id'), nullable=True, index=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    folder = db.relationship('Folder', back_populates='files')
    owner = db.relationship('User', back_populates='files')

    __table_args__ = (
        db.UniqueConstraint('folder_id', 'name', 'owner_id', name='unique_file_name_per_folder'),
    )

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'original_filename': self.original_filename,
            'size_bytes': self.size_bytes,
            'mime_type': self.mime_type,
            'folder_id': self.folder_id,
            'owner_id': self.owner_id,
            'owner_name': self.owner.name if self.owner else None,
            'uploaded_at': self.uploaded_at.isoformat() if self.uploaded_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
