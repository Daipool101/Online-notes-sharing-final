// Global variables
let currentUser = null;
let currentPage = 1;
let currentFilters = {};

// API Base URL
const API_BASE = '/api';

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    checkAuthStatus();
});

// Initialize application
function initializeApp() {
    // Setup navigation
    setupNavigation();
    
    // Load initial data
    loadFilterOptions();
    
    // Show home page by default
    showPage('home');
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.getElementById('hamburger').addEventListener('click', toggleMobileMenu);
    
    // Forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);
    document.getElementById('upload-form').addEventListener('submit', handleUpload);
    
    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);
    
    // File upload
    document.getElementById('note-file').addEventListener('change', handleFileSelect);
    
    // Search
    document.getElementById('search-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            searchNotes();
        }
    });
}

// Navigation functions
function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link[data-page]');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = this.getAttribute('data-page');
            showPage(page);
        });
    });
}

function showPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(page => {
        page.classList.remove('active');
    });
    
    // Show selected page
    const targetPage = document.getElementById(pageName + '-page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load page-specific data
    switch(pageName) {
        case 'browse':
            loadNotes();
            break;
        case 'my-notes':
            loadMyNotes();
            break;
        case 'admin':
            loadAdminData();
            break;
    }
}

function toggleMobileMenu() {
    const navMenu = document.getElementById('nav-menu');
    navMenu.classList.toggle('active');
}

// Authentication functions
async function checkAuthStatus() {
    try {
        const response = await fetch(`${API_BASE}/auth/check-auth`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            updateUIForAuthenticatedUser();
        } else {
            updateUIForUnauthenticatedUser();
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        updateUIForUnauthenticatedUser();
    }
}

function updateUIForAuthenticatedUser() {
    // Show authenticated elements
    document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = '';
    });
    
    // Hide unauthenticated elements
    document.querySelectorAll('.auth-not-required').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show admin elements if user is admin
    if (currentUser && currentUser.is_admin) {
        document.querySelectorAll('.admin-required').forEach(el => {
            el.style.display = '';
        });
    }
}

function updateUIForUnauthenticatedUser() {
    // Hide authenticated elements
    document.querySelectorAll('.auth-required').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show unauthenticated elements
    document.querySelectorAll('.auth-not-required').forEach(el => {
        el.style.display = '';
    });
    
    // Hide admin elements
    document.querySelectorAll('.admin-required').forEach(el => {
        el.style.display = 'none';
    });
}

async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const loginData = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(loginData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUIForAuthenticatedUser();
            showToast('Login successful!', 'success');
            showPage('home');
            e.target.reset();
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        showToast('Login failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const registerData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password')
    };
    
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(registerData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showToast('Registration successful! Please login.', 'success');
            showPage('login');
            e.target.reset();
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        showToast('Registration failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include'
        });
        
        currentUser = null;
        updateUIForUnauthenticatedUser();
        showToast('Logged out successfully', 'success');
        showPage('home');
    } catch (error) {
        showToast('Logout failed', 'error');
    }
}

// File upload functions
function handleFileSelect(e) {
    const file = e.target.files[0];
    const fileUploadText = document.querySelector('.file-upload-text span');
    
    if (file) {
        fileUploadText.textContent = file.name;
    } else {
        fileUploadText.textContent = 'Choose file or drag and drop';
    }
}

async function handleUpload(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    // Add user_id to formData
    if (currentUser && currentUser.id) {
        formData.append('user_id', currentUser.id);
    }

    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Note uploaded successfully! It will be reviewed by admin.', 'success');
            e.target.reset();
            document.querySelector('.file-upload-text span').textContent = 'Choose file or drag and drop';
        } else {
            showToast(data.error || 'Upload failed', 'error');
        }
    } catch (error) {
        showToast('Upload failed. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Notes functions
async function loadNotes(page = 1) {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: page,
            per_page: 12,
            ...currentFilters
        });
        
        const response = await fetch(`${API_BASE}/notes?${params}`);
        const data = await response.json();
        
        if (response.ok) {
            displayNotes(data.notes, 'notes-grid');
            displayPagination(data, 'pagination', loadNotes);
        } else {
            showToast('Failed to load notes', 'error');
        }
    } catch (error) {
        showToast('Failed to load notes', 'error');
    } finally {
        showLoading(false);
    }
}

async function loadMyNotes(page = 1) {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: page,
            per_page: 12
        });
        
        const response = await fetch(`${API_BASE}/my-notes?${params}`, {
            credentials: 'include'
        });
        const data = await response.json();
        
        if (response.ok) {
            displayNotes(data.notes, 'my-notes-grid', true);
            displayPagination(data, 'my-notes-pagination', loadMyNotes);
        } else {
            showToast('Failed to load your notes', 'error');
        }
    } catch (error) {
        showToast('Failed to load your notes', 'error');
    } finally {
        showLoading(false);
    }
}

function displayNotes(notes, containerId, showStatus = false) {
    const container = document.getElementById(containerId);
    
    if (notes.length === 0) {
        container.innerHTML = '<div class="no-notes">No notes found.</div>';
        return;
    }
    
    container.innerHTML = notes.map(note => `
        <div class="note-card">
            <div class="note-header">
                <div>
                    <div class="note-title">${escapeHtml(note.title)}</div>
                    ${showStatus ? `<span class="status-badge ${note.is_approved ? 'status-approved' : 'status-pending'}">
                        ${note.is_approved ? 'Approved' : 'Pending'}
                    </span>` : ''}
                </div>
            </div>
            <div class="note-meta">
                <span><i class="fas fa-book"></i> ${escapeHtml(note.subject)}</span>
                <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(note.course)}</span>
                <span><i class="fas fa-calendar"></i> ${escapeHtml(note.semester)}</span>
            </div>
            ${note.description ? `<div class="note-description">${escapeHtml(note.description)}</div>` : ''}
            <div class="note-meta">
                <span><i class="fas fa-user"></i> ${escapeHtml(note.uploader_name || ('User #' + note.user_id))}</span>
                <span><i class="fas fa-download"></i> ${note.download_count !== undefined ? note.download_count : 0} downloads</span>
                <span><i class="fas fa-file"></i> ${note.file_name && note.file_name.endsWith('.pdf') ? note.file_name : (note.original_file_name ? note.original_file_name : note.file_name || 'N/A')}</span>
            </div>
            <div class="note-actions">
                ${note.file_name ? `<button class="btn btn-primary" onclick="downloadNote(${note.id}, '${note.original_file_name ? note.original_file_name : note.file_name}')"><i class=\"fas fa-download\"></i> Download</button>` : ''}
            </div>
        </div>
    `).join('');
}

async function downloadNote(noteId, originalFileName = 'note') {
    try {
        const response = await fetch(`${API_BASE}/notes/${noteId}/download`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = originalFileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } else {
            showToast('Download failed', 'error');
        }
    } catch (error) {
        showToast('Download failed', 'error');
    }
}

// Search and filter functions
async function loadFilterOptions() {
    try {
        const [subjectsRes, coursesRes, semestersRes] = await Promise.all([
            fetch(`${API_BASE}/subjects`),
            fetch(`${API_BASE}/courses`),
            fetch(`${API_BASE}/semesters`)
        ]);
        
        const subjects = await subjectsRes.json();
        const courses = await coursesRes.json();
        const semesters = await semestersRes.json();
        
        populateSelect('subject-filter', subjects.subjects);
        populateSelect('course-filter', courses.courses);
        populateSelect('semester-filter', semesters.semesters);
    } catch (error) {
        console.error('Failed to load filter options:', error);
    }
}

function populateSelect(selectId, options) {
    const select = document.getElementById(selectId);
    const currentOptions = Array.from(select.options).slice(1); // Keep first option
    
    currentOptions.forEach(option => option.remove());
    
    options.forEach(option => {
        const optionElement = document.createElement('option');
        optionElement.value = option;
        optionElement.textContent = option;
        select.appendChild(optionElement);
    });
}

function searchNotes() {
    const searchTerm = document.getElementById('search-input').value;
    currentFilters.search = searchTerm;
    loadNotes(1);
}

function applyFilters() {
    currentFilters = {
        subject: document.getElementById('subject-filter').value,
        course: document.getElementById('course-filter').value,
        semester: document.getElementById('semester-filter').value,
        search: document.getElementById('search-input').value
    };
    
    // Remove empty filters
    Object.keys(currentFilters).forEach(key => {
        if (!currentFilters[key]) {
            delete currentFilters[key];
        }
    });
    
    loadNotes(1);
}

// Admin functions
async function loadAdminData() {
    showAdminTab('all');
}

async function showAdminTab(tab) {
    const container = document.getElementById('admin-content');
    try {
        showLoading(true);
        const response = await fetch(`${API_BASE}/admin/all-notes`, {
            credentials: 'include'
        });
        const data = await response.json();
        if (response.ok) {
            displayAdminNotes(data.notes, container);
        } else {
            showToast('Failed to load notes', 'error');
        }
    } catch (error) {
        showToast('Failed to load admin data', 'error');
    } finally {
        showLoading(false);
    }
}

function displayAdminNotes(notes, container) {
    if (notes.length === 0) {
        container.innerHTML = '<div class="no-notes">No notes found.</div>';
        return;
    }
    container.innerHTML = `
        <div class="notes-grid">
            ${notes.map(note => `
                <div class="note-card">
                    <div class="note-title">${escapeHtml(note.title)}</div>
                    <div class="note-meta">
                        <span><i class="fas fa-book"></i> ${escapeHtml(note.subject)}</span>
                        <span><i class="fas fa-graduation-cap"></i> ${escapeHtml(note.course)}</span>
                        <span><i class="fas fa-calendar"></i> ${escapeHtml(note.semester)}</span>
                    </div>
                    ${note.description ? `<div class="note-description">${escapeHtml(note.description)}</div>` : ''}
                    <div class="note-meta">
                        <span><i class="fas fa-user"></i> Uploader: ${escapeHtml(note.uploader_name || ('User #' + note.user_id))}</span>
                        <span><i class="fas fa-calendar-plus"></i> Uploaded: ${note.upload_date ? escapeHtml(note.upload_date) : 'N/A'}</span>
                        <span><i class="fas fa-file"></i> Type: ${note.file_name ? note.file_name.split('.').pop().toUpperCase() : 'N/A'}</span>
                        <span class="status-badge ${note.is_approved ? 'status-approved' : 'status-pending'}">
                            ${note.is_approved ? 'Approved' : 'Pending'}
                        </span>
                    </div>
                    <div class="note-actions">
                        ${!note.is_approved ? `
                            <button class="btn btn-primary" onclick="approveNote(${note.id})">
                                <i class="fas fa-check"></i> Approve
                            </button>
                            <button class="btn btn-secondary" onclick="rejectNote(${note.id})" style="background: #dc3545; color: white;">
                                <i class="fas fa-times"></i> Reject
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

async function approveNote(noteId) {
    try {
        const response = await fetch(`${API_BASE}/admin/notes/${noteId}/approve`, {
            method: 'POST',
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast('Note approved successfully', 'success');
            loadAdminData();
        } else {
            showToast('Failed to approve note', 'error');
        }
    } catch (error) {
        showToast('Failed to approve note', 'error');
    }
}

async function rejectNote(noteId) {
    if (!confirm('Are you sure you want to reject this note? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/admin/notes/${noteId}/reject`, {
            method: 'DELETE',
            credentials: 'include'
        });
        
        if (response.ok) {
            showToast('Note rejected successfully', 'success');
            loadAdminData();
        } else {
            showToast('Failed to reject note', 'error');
        }
    } catch (error) {
        showToast('Failed to reject note', 'error');
    }
}

// Pagination
function displayPagination(data, containerId, loadFunction) {
    const container = document.getElementById(containerId);
    const { current_page, pages, total } = data;
    
    if (pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    if (current_page > 1) {
        paginationHTML += `<button onclick="${loadFunction.name}(${current_page - 1})">Previous</button>`;
    }
    
    // Page numbers
    for (let i = Math.max(1, current_page - 2); i <= Math.min(pages, current_page + 2); i++) {
        paginationHTML += `<button class="${i === current_page ? 'active' : ''}" onclick="${loadFunction.name}(${i})">${i}</button>`;
    }
    
    // Next button
    if (current_page < pages) {
        paginationHTML += `<button onclick="${loadFunction.name}(${current_page + 1})">Next</button>`;
    }
    
    container.innerHTML = paginationHTML;
}

// Utility functions
function showLoading(show) {
    const loading = document.getElementById('loading');
    loading.style.display = show ? 'flex' : 'none';
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

