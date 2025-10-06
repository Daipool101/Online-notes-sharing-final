from flask import Blueprint, jsonify, request, session, send_file, current_app
from werkzeug.utils import secure_filename
from src.models.note import Note, db
from src.models.user import User
import os
import uuid
from datetime import datetime

notes_bp = Blueprint('notes', __name__)

ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'ppt', 'pptx'}
UPLOAD_FOLDER = 'uploads'

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def require_auth(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

def require_admin(f):
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        if not session.get('is_admin', False):
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    decorated_function.__name__ = f.__name__
    return decorated_function

@notes_bp.route('/upload', methods=['POST'])
@require_auth
def upload_note():
    try:
        # Check if file is present
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only PDF, DOC, DOCX, PPT, PPTX are allowed'}), 400
        
        # Get form data
        title = request.form.get('title', '').strip()
        subject = request.form.get('subject', '').strip()
        course = request.form.get('course', '').strip()
        semester = request.form.get('semester', '').strip()
        description = request.form.get('description', '').strip()
        
        # Validate required fields
        if not all([title, subject, course, semester]):
            return jsonify({'error': 'Title, subject, course, and semester are required'}), 400
        
        # Create upload directory if it doesn't exist
        upload_dir = os.path.join(current_app.root_path, UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(upload_dir, unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Get file extension
        file_extension = filename.rsplit('.', 1)[1].upper()
        
        # Create note record
        note = Note(
            title=title,
            subject=subject,
            course=course,
            semester=semester,
            filename=filename,
            file_path=file_path,
            file_type=file_extension,
            description=description,
            uploader_id=session['user_id']
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'message': 'Note uploaded successfully',
            'note': note.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Upload failed'}), 500

@notes_bp.route('/notes', methods=['GET'])
def get_notes():
    try:
        # Get query parameters
        subject = request.args.get('subject', '')
        course = request.args.get('course', '')
        semester = request.args.get('semester', '')
        search = request.args.get('search', '')
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        # Build query
        query = Note.query.filter_by(is_approved=True)
        
        if subject:
            query = query.filter(Note.subject.ilike(f'%{subject}%'))
        if course:
            query = query.filter(Note.course.ilike(f'%{course}%'))
        if semester:
            query = query.filter(Note.semester.ilike(f'%{semester}%'))
        if search:
            query = query.filter(
                (Note.title.ilike(f'%{search}%')) |
                (Note.description.ilike(f'%{search}%'))
            )
        
        # Order by upload date (newest first)
        query = query.order_by(Note.upload_date.desc())
        
        # Paginate results
        notes = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'notes': [note.to_dict() for note in notes.items],
            'total': notes.total,
            'pages': notes.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch notes'}), 500

@notes_bp.route('/notes/<int:note_id>/download', methods=['GET'])
def download_note(note_id):
    try:
        note = Note.query.get_or_404(note_id)
        
        if not note.is_approved:
            return jsonify({'error': 'Note not approved for download'}), 403
        
        # Increment download count
        note.download_count += 1
        db.session.commit()
        
        # Send file
        return send_file(
            note.file_path,
            as_attachment=True,
            download_name=note.filename
        )
        
    except Exception as e:
        return jsonify({'error': 'Download failed'}), 500

@notes_bp.route('/my-notes', methods=['GET'])
@require_auth
def get_my_notes():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        notes = Note.query.filter_by(uploader_id=session['user_id'])\
                         .order_by(Note.upload_date.desc())\
                         .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'notes': [note.to_dict() for note in notes.items],
            'total': notes.total,
            'pages': notes.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch your notes'}), 500

@notes_bp.route('/admin/pending-notes', methods=['GET'])
@require_admin
def get_pending_notes():
    try:
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 10))
        
        notes = Note.query.filter_by(is_approved=False)\
                         .order_by(Note.upload_date.desc())\
                         .paginate(page=page, per_page=per_page, error_out=False)
        
        return jsonify({
            'notes': [note.to_dict() for note in notes.items],
            'total': notes.total,
            'pages': notes.pages,
            'current_page': page,
            'per_page': per_page
        }), 200
        
    except Exception as e:
        return jsonify({'error': 'Failed to fetch pending notes'}), 500

@notes_bp.route('/admin/notes/<int:note_id>/approve', methods=['POST'])
@require_admin
def approve_note(note_id):
    try:
        note = Note.query.get_or_404(note_id)
        note.is_approved = True
        db.session.commit()
        
        return jsonify({
            'message': 'Note approved successfully',
            'note': note.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to approve note'}), 500

@notes_bp.route('/admin/notes/<int:note_id>/reject', methods=['DELETE'])
@require_admin
def reject_note(note_id):
    try:
        note = Note.query.get_or_404(note_id)
        
        # Delete file from filesystem
        if os.path.exists(note.file_path):
            os.remove(note.file_path)
        
        # Delete note from database
        db.session.delete(note)
        db.session.commit()
        
        return jsonify({'message': 'Note rejected and deleted successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to reject note'}), 500

@notes_bp.route('/subjects', methods=['GET'])
def get_subjects():
    try:
        subjects = db.session.query(Note.subject).filter_by(is_approved=True).distinct().all()
        return jsonify({'subjects': [s[0] for s in subjects]}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch subjects'}), 500

@notes_bp.route('/courses', methods=['GET'])
def get_courses():
    try:
        courses = db.session.query(Note.course).filter_by(is_approved=True).distinct().all()
        return jsonify({'courses': [c[0] for c in courses]}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch courses'}), 500

@notes_bp.route('/semesters', methods=['GET'])
def get_semesters():
    try:
        semesters = db.session.query(Note.semester).filter_by(is_approved=True).distinct().all()
        return jsonify({'semesters': [s[0] for s in semesters]}), 200
    except Exception as e:
        return jsonify({'error': 'Failed to fetch semesters'}), 500

