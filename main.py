import os
import sys
# DON'T CHANGE THIS !!!
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

#Username: admin
#Password: admin123

from flask import Flask, send_from_directory
from flask_cors import CORS
from src.models import db
from src.models.note import Note  # Import Note model
from src.routes.user import user_bp
from src.routes.auth import auth_bp
from src.routes.notes import notes_bp
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__, static_folder=os.path.dirname(__file__))
app.config['SECRET_KEY'] = 'asdf#FGSgvasgf$5$WGT'

# Enable CORS for all routes
CORS(app, supports_credentials=True)

# Register blueprints
app.register_blueprint(user_bp, url_prefix='/api')
app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(notes_bp, url_prefix='/api')


# Ensure uploads directory exists and configure database
uploads_dir = os.path.join(os.path.dirname(__file__), 'src', 'uploads')
os.makedirs(uploads_dir, exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{os.path.join(uploads_dir, 'notes.db')}"
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

db.init_app(app)
with app.app_context():
    from src.models.user import User  # Import model before creating tables
    db.create_all()
    # Create default admin user if it doesn't exist
    admin_user = User.query.filter_by(username='admin').first()
    if not admin_user:
        admin_user = User(username='admin', email='admin@notessharing.com', is_admin=True)
        admin_user.set_password('admin123')
        db.session.add(admin_user)
        db.session.commit()
        print("Default admin user created: username=admin, password=admin123")
    else:
        # Auto-repair admin account to ensure known credentials work in dev
        updated = False
        if not admin_user.is_admin:
            admin_user.is_admin = True
            updated = True
        # If password does not match the expected dev password, reset it
        try:
            password_ok = admin_user.check_password('admin123')
        except Exception:
            password_ok = False
        if not password_ok:
            admin_user.set_password('admin123')
            updated = True
        if admin_user.email != 'admin@notessharing.com':
            admin_user.email = 'admin@notessharing.com'
            updated = True
        if updated:
            db.session.commit()
            print("Admin account repaired: username=admin, password=admin123")

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    static_folder_path = app.static_folder
    if static_folder_path is None:
            return "Static folder not configured", 404

    if path != "" and os.path.exists(os.path.join(static_folder_path, path)):
        return send_from_directory(static_folder_path, path)
    else:
        index_path = os.path.join(static_folder_path, 'index.html')
        if os.path.exists(index_path):
            return send_from_directory(static_folder_path, 'index.html')
        else:
            return "index.html not found", 404


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
