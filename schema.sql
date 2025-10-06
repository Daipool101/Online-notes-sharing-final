-- Online Notes Sharing System Database Schema
-- This file documents the database structure used by the application
-- The application uses SQLAlchemy ORM, so this is for reference only

-- Users table
CREATE TABLE user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_admin BOOLEAN DEFAULT FALSE,
    registration_date DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notes table
CREATE TABLE note (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    course VARCHAR(100) NOT NULL,
    semester VARCHAR(50) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(10) NOT NULL,
    description TEXT,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploader_id INTEGER NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    download_count INTEGER DEFAULT 0,
    FOREIGN KEY (uploader_id) REFERENCES user(id)
);

-- Indexes for better performance
CREATE INDEX idx_note_subject ON note(subject);
CREATE INDEX idx_note_course ON note(course);
CREATE INDEX idx_note_semester ON note(semester);
CREATE INDEX idx_note_uploader ON note(uploader_id);
CREATE INDEX idx_note_approved ON note(is_approved);
CREATE INDEX idx_note_upload_date ON note(upload_date);

-- Sample data (for testing purposes)
-- Default admin user (password: admin123)
INSERT INTO user (username, email, password_hash, is_admin) VALUES 
('admin', 'admin@notessharing.com', 'pbkdf2:sha256:600000$salt$hash', TRUE);

-- Sample notes (for demonstration)
INSERT INTO note (title, subject, course, semester, filename, file_path, file_type, description, uploader_id, is_approved) VALUES
('Introduction to Python Programming', 'Computer Science', 'CS101', 'Fall 2024', 'python_intro.pdf', '/uploads/python_intro.pdf', 'PDF', 'Basic Python programming concepts and syntax', 1, TRUE),
('Calculus I Notes', 'Mathematics', 'MATH101', 'Fall 2024', 'calculus_notes.pdf', '/uploads/calculus_notes.pdf', 'PDF', 'Differential and integral calculus fundamentals', 1, TRUE),
('Physics Mechanics', 'Physics', 'PHYS101', 'Spring 2024', 'mechanics.pptx', '/uploads/mechanics.pptx', 'PPTX', 'Classical mechanics principles and applications', 1, TRUE);

-- Views for common queries
CREATE VIEW approved_notes AS
SELECT 
    n.*,
    u.username as uploader_name
FROM note n
JOIN user u ON n.uploader_id = u.id
WHERE n.is_approved = TRUE;

CREATE VIEW pending_notes AS
SELECT 
    n.*,
    u.username as uploader_name
FROM note n
JOIN user u ON n.uploader_id = u.id
WHERE n.is_approved = FALSE;

-- Statistics view
CREATE VIEW note_statistics AS
SELECT 
    COUNT(*) as total_notes,
    COUNT(CASE WHEN is_approved = TRUE THEN 1 END) as approved_notes,
    COUNT(CASE WHEN is_approved = FALSE THEN 1 END) as pending_notes,
    SUM(download_count) as total_downloads,
    COUNT(DISTINCT uploader_id) as active_uploaders
FROM note;

