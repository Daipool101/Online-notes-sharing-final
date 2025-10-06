from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from src.models.user import db

class Note(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    course = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.String(50), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_type = db.Column(db.String(10), nullable=False)  # PDF, DOC, PPT
    description = db.Column(db.Text)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    uploader_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_approved = db.Column(db.Boolean, default=False)
    download_count = db.Column(db.Integer, default=0)
    
    # Relationship with User
    uploader = db.relationship('User', backref=db.backref('notes', lazy=True))

    def __repr__(self):
        return f'<Note {self.title}>'

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'course': self.course,
            'semester': self.semester,
            'filename': self.filename,
            'file_type': self.file_type,
            'description': self.description,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'uploader_id': self.uploader_id,
            'uploader_name': self.uploader.username if self.uploader else None,
            'is_approved': self.is_approved,
            'download_count': self.download_count
        }

