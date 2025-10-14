from datetime import datetime
from sqlalchemy.orm import backref
from app import db

class Folder(db.Model):
    __tablename__ = 'folders'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    parent_id = db.Column(db.Integer, db.ForeignKey('folders.id', ondelete='CASCADE'), nullable=True, index=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    parent = db.relationship('Folder', remote_side=[id], backref=backref('subfolders', cascade='all, delete-orphan'))
    owner = db.relationship('User', back_populates='folders')
    files = db.relationship('File', back_populates='folder', cascade='all, delete-orphan')

    __table_args__ = (
        db.UniqueConstraint('parent_id', 'name', 'owner_id', name='unique_folder_name_per_parent'),
    )

    def to_dict(self, include_contents=False):
        result = {
            'id': self.id,
            'name': self.name,
            'parent_id': self.parent_id,
            'owner_id': self.owner_id,
            'owner_name': self.owner.name if self.owner else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_contents:
            result['subfolders'] = [f.to_dict() for f in self.subfolders]
            result['files'] = [f.to_dict() for f in self.files]
        return result
