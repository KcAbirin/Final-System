const API_URL = 'http://localhost:5000/api';
let authToken = null;
let currentStudent = null;
let currentProjects = [];
let currentMeetings = [];


/// ============================================
// PAGE DETECTION & INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    const currentPage = window.location.pathname.split('/').pop();
    const isLoginPage = currentPage === 'index.html' || currentPage === '';

    // Debug: Log page and auth state
    console.log('[DEBUG] Current page:', currentPage, '| Is login page:', isLoginPage);

    // Prevent multiple redirects in a single event loop
    let redirected = false;

    // 1. The Bouncer: Check auth BEFORE doing anything else
    const isAuthorized = checkAuth(isLoginPage, (url) => {
        if (!redirected) {
            redirected = true;
            console.log('[DEBUG] Redirecting to:', url);
            window.location.replace(url);
        } else {
            console.log('[DEBUG] Prevented double redirect to:', url);
        }
    });

    // 2. If they are on a protected page but not authorized, STOP everything.
    if (!isAuthorized && !isLoginPage) {
        console.log('[DEBUG] Not authorized and not on login page. Stopping init.');
        return;
    }

    // 3. If they ARE authorized but sitting on the login page, STOP everything.
    if (isAuthorized && isLoginPage) {
        console.log('[DEBUG] Authorized and on login page. Stopping init.');
        return;
    }

    // 4. If we made it here, it's safe to initialize the specific page
    if (isLoginPage) {
        initLoginPage();
    } else if (currentPage === 'dashboard.html') {
        initDashboardPage();
    } else if (currentPage === 'projects.html') {
        initProjectsPage();
    } else if (currentPage === 'meetings.html') {
        initMeetingsPage();
    } else if (currentPage === 'calendar.html') {
        initCalendarPage();
    }
});

// ============================================
// AUTHENTICATION FUNCTIONS
// ============================================
function checkAuth(isLoginPage, redirectFn) {
    authToken = localStorage.getItem('authToken');
    const studentData = localStorage.getItem('studentData');

    // If they DON'T have credentials
    if (!authToken || !studentData) {
        if (!isLoginPage && typeof redirectFn === 'function') {
            redirectFn('index.html');
        }
        return false;
    }

    // If they DO have credentials but are looking at the login page
    if (isLoginPage && typeof redirectFn === 'function') {
        redirectFn('dashboard.html');
        return true;
    }

    // Standard setup for authorized users
    currentStudent = JSON.parse(studentData);
    updateUserInterface();
    return true;
}

function updateUserInterface() {
    const studentNameElements = document.querySelectorAll('#studentName');
    studentNameElements.forEach(el => {
        if (el) el.textContent = currentStudent.full_name || currentStudent.first_name + ' ' + currentStudent.last_name;
    });
    
    const greetingNameEl = document.getElementById('greetingName');
    if (greetingNameEl) {
        greetingNameEl.textContent = currentStudent.first_name || currentStudent.full_name;
    }
    
    const studentCourseEl = document.getElementById('studentCourse');
    if (studentCourseEl) {
        studentCourseEl.textContent = currentStudent.course || 'Computer Science';
    }
    
    const avatarEl = document.getElementById('studentAvatar');
    if (avatarEl && currentStudent.full_name) {
        const initials = currentStudent.full_name.split(' ').map(n => n[0]).join('');
        avatarEl.textContent = initials;
    }
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken');
    
    if (!token) {
        window.location.replace('index.html');
        throw new Error('No auth token');
    }
    
    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            'x-auth-token': token
        }
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(`${API_URL}${url}`, mergedOptions);
    
    if (response.status === 401) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('studentData');
        window.location.replace('index.html');
        throw new Error('Session expired');
    }
    
    return response;
}

function handleLogout() {
    // Close any open modals
    const modals = document.querySelectorAll('[id$="Modal"]');
    modals.forEach(modal => modal.style.display = 'none');
    
    // Destroy chart if it exists
    if (typeof dashboardChart !== 'undefined' && dashboardChart) {
        dashboardChart.destroy();
        dashboardChart = null;
    }
    
    // Clear auth data
    localStorage.removeItem('authToken');
    localStorage.removeItem('studentData');
    
    // Clear global variables
    currentStudent = null;
    currentProjects = [];
    currentMeetings = [];
    
    // Redirect to login using replace()
    window.location.replace('index.html');
}
// ============================================

// LOGIN PAGE

// ============================================

function initLoginPage() {

    const loginForm = document.getElementById('loginForm');

    const signupLink = document.getElementById('signupLink');

    const forgotPasswordLink = document.getElementById('forgotPasswordLink');

   

    if (loginForm) {

        loginForm.addEventListener('submit', handleLogin);

        const savedStudentId = localStorage.getItem('rememberedStudentId');

        if (savedStudentId) {

            document.getElementById('studentId').value = savedStudentId;

            const rememberCheckbox = document.getElementById('rememberMe');

            if (rememberCheckbox) rememberCheckbox.checked = true;

        }

    }

   

    if (signupLink) {

        signupLink.addEventListener('click', (e) => {

            e.preventDefault();

            openSignupModal();

        });

    }

   

    if (forgotPasswordLink) {

        forgotPasswordLink.addEventListener('click', (e) => {

            e.preventDefault();

            openForgotPasswordModal();

        });

    }

   

    const closeButtons = document.querySelectorAll('.close-modal');

    closeButtons.forEach(btn => {

        btn.addEventListener('click', () => {

            closeSignupModal();

            closeForgotPasswordModal();

        });

    });

   

    const cancelButtons = document.querySelectorAll('.cancel-btn');

    cancelButtons.forEach(btn => {

        btn.addEventListener('click', () => {

            closeSignupModal();

            closeForgotPasswordModal();

        });

    });

   

    const signupForm = document.getElementById('signupForm');

    if (signupForm) {

        signupForm.addEventListener('submit', handleSignup);

    }

   

    const forgotPasswordForm = document.getElementById('forgotPasswordForm');

    if (forgotPasswordForm) {

        forgotPasswordForm.addEventListener('submit', handleForgotPassword);

    }

}



async function handleLogin(e) {

    e.preventDefault();

   

    const studentId = document.getElementById('studentId').value;

    const password = document.getElementById('password').value;

    const rememberMe = document.getElementById('rememberMe')?.checked || false;

   

    if (rememberMe) {

        localStorage.setItem('rememberedStudentId', studentId);

    } else {

        localStorage.removeItem('rememberedStudentId');

    }

   

    const loginBtn = document.querySelector('.login-btn');

    const originalText = loginBtn.textContent;

    loginBtn.textContent = 'Logging in...';

    loginBtn.disabled = true;

   

    try {

        const response = await fetch(`${API_URL}/auth/login`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ student_id: studentId, password })

        });

       

        const data = await response.json();

       

        if (response.ok) {

            localStorage.setItem('authToken', data.token);

            localStorage.setItem('studentData', JSON.stringify(data.student));

            window.location.href = 'dashboard.html';

        } else {

            alert(data.message || 'Login failed');

        }

    } catch (error) {

        console.error('Login error:', error);

        alert('Error connecting to server');

    } finally {

        loginBtn.textContent = originalText;

        loginBtn.disabled = false;

    }

}



function openSignupModal() {

    const modal = document.getElementById('signupModal');

    if (modal) modal.style.display = 'flex';

}



function closeSignupModal() {

    const modal = document.getElementById('signupModal');

    if (modal) {

        modal.style.display = 'none';

        const form = document.getElementById('signupForm');

        if (form) form.reset();

    }

}



async function handleSignup(e) {

    e.preventDefault();

   

    const studentId = document.getElementById('signupStudentId').value;

    const firstName = document.getElementById('firstName').value;

    const lastName = document.getElementById('lastName').value;

    const email = document.getElementById('email').value;

    const password = document.getElementById('signupPassword').value;

    const confirmPassword = document.getElementById('confirmPassword').value;

    const course = document.getElementById('course').value;

   

    if (password !== confirmPassword) {

        alert('Passwords do not match');

        return;

    }

   

    if (password.length < 6) {

        alert('Password must be at least 6 characters');

        return;

    }

   

    const signupBtn = document.querySelector('#signupModal .save-btn');

    const originalText = signupBtn.textContent;

    signupBtn.textContent = 'Creating...';

    signupBtn.disabled = true;

   

    try {

        const response = await fetch(`${API_URL}/auth/register`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({

                student_id: studentId,

                first_name: firstName,

                last_name: lastName,

                email: email,

                password: password,

                course: course

            })

        });

       

        const data = await response.json();

       

        if (response.ok) {

            alert('Account created! Please log in.');

            closeSignupModal();

            document.getElementById('studentId').value = studentId;

        } else {

            alert(data.message || 'Error creating account');

        }

    } catch (error) {

        console.error('Signup error:', error);

        alert('Error connecting to server');

    } finally {

        signupBtn.textContent = originalText;

        signupBtn.disabled = false;

    }

}



function openForgotPasswordModal() {

    const modal = document.getElementById('forgotPasswordModal');

    if (modal) modal.style.display = 'flex';

}



function closeForgotPasswordModal() {

    const modal = document.getElementById('forgotPasswordModal');

    if (modal) {

        modal.style.display = 'none';

        const form = document.getElementById('forgotPasswordForm');

        if (form) form.reset();

    }

}



async function handleForgotPassword(e) {

    e.preventDefault();

    const identifier = document.getElementById('resetIdentifier').value;

   

    const resetBtn = document.querySelector('#forgotPasswordModal .save-btn');

    const originalText = resetBtn.textContent;

    resetBtn.textContent = 'Sending...';

    resetBtn.disabled = true;

   

    try {

        const response = await fetch(`${API_URL}/auth/forgot-password`, {

            method: 'POST',

            headers: { 'Content-Type': 'application/json' },

            body: JSON.stringify({ identifier })

        });

       

        if (response.ok) {

            alert('If an account exists, you will receive reset instructions.');

            closeForgotPasswordModal();

        } else {

            alert('Error processing request');

        }

    } catch (error) {

        console.error('Forgot password error:', error);

        alert('Error connecting to server');

    } finally {

        resetBtn.textContent = originalText;

        resetBtn.disabled = false;

    }

}
// ============================================
// LOGIN PAGE
// ============================================
function initLoginPage() {
    const loginForm = document.getElementById('loginForm');
    const signupLink = document.getElementById('signupLink');
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
        const savedStudentId = localStorage.getItem('rememberedStudentId');
        if (savedStudentId) {
            document.getElementById('studentId').value = savedStudentId;
            const rememberCheckbox = document.getElementById('rememberMe');
            if (rememberCheckbox) rememberCheckbox.checked = true;
        }
    }
    
    if (signupLink) {
        signupLink.addEventListener('click', (e) => {
            e.preventDefault();
            openSignupModal();
        });
    }
    
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            openForgotPasswordModal();
        });
    }
    
    const closeButtons = document.querySelectorAll('.close-modal');
    closeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeSignupModal();
            closeForgotPasswordModal();
        });
    });
    
    const cancelButtons = document.querySelectorAll('.cancel-btn');
    cancelButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            closeSignupModal();
            closeForgotPasswordModal();
        });
    });
    
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    
    const forgotPasswordForm = document.getElementById('forgotPasswordForm');
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('studentId').value;
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;
    
    if (rememberMe) {
        localStorage.setItem('rememberedStudentId', studentId);
    } else {
        localStorage.removeItem('rememberedStudentId');
    }
    
    const loginBtn = document.querySelector('.login-btn');
    const originalText = loginBtn.textContent;
    loginBtn.textContent = 'Logging in...';
    loginBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ student_id: studentId, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('studentData', JSON.stringify(data.student));
            window.location.href = 'dashboard.html';
        } else {
            alert(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Error connecting to server');
    } finally {
        loginBtn.textContent = originalText;
        loginBtn.disabled = false;
    }
}

function openSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) modal.style.display = 'flex';
}

function closeSignupModal() {
    const modal = document.getElementById('signupModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('signupForm');
        if (form) form.reset();
    }
}

async function handleSignup(e) {
    e.preventDefault();
    
    const studentId = document.getElementById('signupStudentId').value;
    const firstName = document.getElementById('firstName').value;
    const lastName = document.getElementById('lastName').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const course = document.getElementById('course').value;
    
    if (password !== confirmPassword) {
        alert('Passwords do not match');
        return;
    }
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters');
        return;
    }
    
    const signupBtn = document.querySelector('#signupModal .save-btn');
    const originalText = signupBtn.textContent;
    signupBtn.textContent = 'Creating...';
    signupBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: studentId,
                first_name: firstName,
                last_name: lastName,
                email: email,
                password: password,
                course: course
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            alert('Account created! Please log in.');
            closeSignupModal();
            document.getElementById('studentId').value = studentId;
        } else {
            alert(data.message || 'Error creating account');
        }
    } catch (error) {
        console.error('Signup error:', error);
        alert('Error connecting to server');
    } finally {
        signupBtn.textContent = originalText;
        signupBtn.disabled = false;
    }
}

function openForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) modal.style.display = 'flex';
}

function closeForgotPasswordModal() {
    const modal = document.getElementById('forgotPasswordModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('forgotPasswordForm');
        if (form) form.reset();
    }
}

async function handleForgotPassword(e) {
    e.preventDefault();
    const identifier = document.getElementById('resetIdentifier').value;
    
    const resetBtn = document.querySelector('#forgotPasswordModal .save-btn');
    const originalText = resetBtn.textContent;
    resetBtn.textContent = 'Sending...';
    resetBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identifier })
        });
        
        if (response.ok) {
            alert('If an account exists, you will receive reset instructions.');
            closeForgotPasswordModal();
        } else {
            alert('Error processing request');
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        alert('Error connecting to server');
    } finally {
        resetBtn.textContent = originalText;
        resetBtn.disabled = false;
    }
}
// ============================================
// DASHBOARD PAGE
// ============================================
let dashboardChart = null;
let dashboardTasks = []; // Store tasks for filtering
let isLoggingOut = false; // Flag to prevent actions during logout

function initDashboardPage() {
    if (!checkAuth()) return;
    
    // --- Search Dropdown ---
    const searchDropdownBtn = document.getElementById('searchDropdownBtn');
    const searchDropdown = document.getElementById('searchDropdown');
    
    if (searchDropdownBtn && searchDropdown) {
        // Toggle dropdown on button click
        searchDropdownBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            searchDropdown.classList.toggle('active');
        });
        
        // Handle Project Overview button (modal popup)
        const projectOverviewBtn = document.getElementById('projectOverviewBtn');
        if (projectOverviewBtn) {
            projectOverviewBtn.addEventListener('click', (e) => {
                e.preventDefault();
                searchDropdown.classList.remove('active');
                // Show project overview modal/popup
                showProjectOverviewModal();
            });
        }
        
        // Handle Upcoming Meetings button (modal popup)
        const upcomingMeetingsBtn = document.getElementById('upcomingMeetingsBtn');
        if (upcomingMeetingsBtn) {
            upcomingMeetingsBtn.addEventListener('click', (e) => {
                e.preventDefault();
                searchDropdown.classList.remove('active');
                // Show upcoming meetings modal/popup
                showUpcomingMeetingsModal();
            });
        }
        
        // Close dropdown when clicking anywhere else
        document.addEventListener('click', (e) => {
            if (!searchDropdownBtn.contains(e.target) && !searchDropdown.contains(e.target)) {
                searchDropdown.classList.remove('active');
            }
        });
        
        // Hover effect: show dropdown item text in search bar
        const dropdownItems = document.querySelectorAll('.dropdown-item');
        dropdownItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const itemText = item.querySelector('.dropdown-text')?.textContent || '';
                const icon = item.querySelector('.dropdown-icon')?.textContent || '';
                searchDropdownBtn.textContent = icon + ' ' + itemText;
            });
            
            item.addEventListener('mouseleave', () => {
                searchDropdownBtn.textContent = 'Quick Navigation';
            });
        });
    }
    
    // --- Notification Toggle ---
    initNotifications();
    
    // --- Edit Profile Handler ---
    const studentProfileBtn = document.getElementById('studentProfileBtn');
    const editProfileModal = document.getElementById('editProfileModal');
    const editProfileForm = document.getElementById('editProfileForm');
    
    if (studentProfileBtn) {
        studentProfileBtn.addEventListener('click', openEditProfileModal);
    }
    
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    const closeProfileModalBtn = document.querySelector('.close-profile-modal');
    if (closeProfileModalBtn) {
        closeProfileModalBtn.addEventListener('click', closeEditProfileModal);
    }
    
    const cancelProfileBtn = document.querySelector('.cancel-profile-btn');
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', closeEditProfileModal);
    }
    
    // Delete Account Handlers
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
    }
    
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', handleDeleteAccount);
    }
    
    const deleteConfirmCheckbox = document.getElementById('deleteConfirmCheckbox');
    if (deleteConfirmCheckbox) {
        deleteConfirmCheckbox.addEventListener('change', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const password = document.getElementById('deletePassword').value;
            if (confirmBtn) {
                confirmBtn.disabled = !(deleteConfirmCheckbox.checked && password);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const deletePassword = document.getElementById('deletePassword');
    if (deletePassword) {
        deletePassword.addEventListener('input', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const checkbox = document.getElementById('deleteConfirmCheckbox');
            if (confirmBtn) {
                confirmBtn.disabled = !(checkbox.checked && deletePassword.value);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const closeDeleteModalBtn = document.querySelector('.close-delete-modal');
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    const cancelDeleteBtn = document.querySelector('.cancel-delete-btn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    // --- Listeners for the Task Modal ---
    const addTaskBtn = document.getElementById('addTaskBtn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', () => openTaskModal());
    
    const closeTaskModalBtn = document.querySelector('.close-task-modal');
    if (closeTaskModalBtn) closeTaskModalBtn.addEventListener('click', closeTaskModal);
    
    const cancelTaskBtns = document.querySelectorAll('.cancel-task-btn');
    cancelTaskBtns.forEach(btn => btn.addEventListener('click', closeTaskModal));
    
    const taskForm = document.getElementById('taskForm');
    if (taskForm) taskForm.addEventListener('submit', handleTaskSubmit);

    // --- Delete Task Listener ---
    const deleteTaskBtn = document.getElementById('deleteTaskBtn');
    if (deleteTaskBtn) {
        deleteTaskBtn.addEventListener('click', async () => {
            const taskId = document.getElementById('taskId').value;
            if (!taskId) return;
            
            if (confirm('Are you sure you want to permanently delete this task?')) {
                try {
                    const response = await fetchWithAuth(`/tasks/${taskId}`, { method: 'DELETE' });
                    if (response.ok) {
                        closeTaskModal();
                        loadDashboardData(); // Refresh list
                    } else {
                        alert('Error deleting task');
                    }
                } catch (error) {
                    console.error('Error:', error);
                }
            }
        });
    }

    // --- Task Filter Listeners ---
    const filterBtns = document.querySelectorAll('.task-filters .filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all buttons and add to clicked button
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Get the filter type
            const filterType = btn.getAttribute('data-filter');
            
            // Filter and display tasks
            filterTasksByDate(filterType);
        });
    });

    loadDashboardData();
}

async function loadDashboardData() {
    try {
        const response = await fetchWithAuth('/dashboard');
        const data = await response.json();
        
        if (response.ok) {
            document.getElementById('totalProjects').textContent = data.stats?.total_projects || 0;
            document.getElementById('ongoingTasks').textContent = data.stats?.ongoing_tasks || 0;
            document.getElementById('upcomingMeetings').textContent = data.stats?.upcoming_meetings || 0;
            displayTasks(data.tasks || []);
            displayDashboardProjects(data.recent_projects || []); 
            displayRecentMeetings(data.recent_meetings || []);
            
            // Calculate project stats from all projects
            try {
                const projectsResponse = await fetchWithAuth('/projects');
                const allProjects = await projectsResponse.json();
                
                // Calculate stats based on actual projects
                const projectStats = [
                    { _id: 'not_started', count: allProjects.filter(p => p.status === 'not_started').length },
                    { _id: 'in_progress', count: allProjects.filter(p => p.status === 'in_progress').length },
                    { _id: 'finished', count: allProjects.filter(p => p.status === 'finished').length }
                ];
                
                initDashboardChart(projectStats);
            } catch (error) {
                console.error('Error loading projects for chart:', error);
                initDashboardChart([]);
            }
            
            // Reset filter buttons to "All"
            const filterBtns = document.querySelectorAll('.task-filters .filter-btn');
            filterBtns.forEach(btn => btn.classList.remove('active'));
            const allBtn = document.querySelector('.task-filters [data-filter="all"]');
            if (allBtn) allBtn.classList.add('active');
            
            // Update notifications
            updateNotifications();
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function displayTasks(tasks) {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    
    // FILTER OUT FINISHED TASKS SO THEY DISAPPEAR FROM DASHBOARD
    const activeTasks = tasks.filter(task => task.status !== 'finished');
    
    // Store tasks globally for filtering
    dashboardTasks = activeTasks;
    
    if (activeTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No active tasks found</td></tr>';
        return;
    }
    
    tbody.innerHTML = activeTasks.map(task => `
        <tr>
            <td>${escapeHtml(task.task_name)}</td>
            <td>${escapeHtml(task.project_id?.project_name || 'Unknown')}</td>
            <td>${formatDate(task.due_date)}</td>
            <td><span class="status-badge status-${task.status?.replace(/_/g, '-') || 'not-started'}">${formatStatus(task.status)}</span></td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="editTask('${task._id}')">EDIT</button>
                <button class="action-btn mark-btn" onclick="markTaskDone('${task._id}')">DONE</button>
            </td>
        </tr>
    `).join('');
}

function filterTasksByDate(filterType) {
    const tbody = document.getElementById('tasksTableBody');
    if (!tbody) return;
    
    if (dashboardTasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No active tasks found</td></tr>';
        return;
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Filter tasks based on the selected filter type
    let filteredTasks = dashboardTasks;
    
    if (filterType === 'today') {
        filteredTasks = dashboardTasks.filter(task => {
            const taskDate = new Date(task.due_date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === today.getTime();
        });
    } else if (filterType === 'tomorrow') {
        filteredTasks = dashboardTasks.filter(task => {
            const taskDate = new Date(task.due_date);
            taskDate.setHours(0, 0, 0, 0);
            return taskDate.getTime() === tomorrow.getTime();
        });
    }
    
    // Rebuild the table with filtered tasks
    if (filteredTasks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty-state">No tasks for this date</td></tr>`;
        return;
    }
    
    tbody.innerHTML = filteredTasks.map(task => `
        <tr>
            <td>${escapeHtml(task.task_name)}</td>
            <td>${escapeHtml(task.project_id?.project_name || 'Unknown')}</td>
            <td>${formatDate(task.due_date)}</td>
            <td><span class="status-badge status-${task.status?.replace(/_/g, '-') || 'not-started'}">${formatStatus(task.status)}</span></td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="editTask('${task._id}')">EDIT</button>
                <button class="action-btn mark-btn" onclick="markTaskDone('${task._id}')">DONE</button>
            </td>
        </tr>
    `).join('');
}

function displayDashboardProjects(projects) {
    const tbody = document.getElementById('projectOverviewBody'); 
    if (!tbody) return;

    if (!projects || projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="empty-state">No active projects</td></tr>';
        return;
    }

    tbody.innerHTML = projects.map(project => `
        <tr>
            <td>${escapeHtml(project.project_name)}</td>
            <td>${escapeHtml(project.adviser)}</td>
            <td><span class="status-badge status-${project.status?.replace(/_/g, '-')}">${formatStatus(project.status)}</span></td>
        </tr>
    `).join('');
}

function displayRecentMeetings(meetings) {
    const tbody = document.getElementById('recentMeetingsBody');
    if (!tbody) return;
    
    if (meetings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No upcoming meetings</td></tr>';
        return;
    }
    
    tbody.innerHTML = meetings.map(meeting => `
        <tr>
            <td>${escapeHtml(meeting.meeting_name)}</td>
            <td>${formatDateTime(meeting.meeting_date_time)}</td>
            <td>${escapeHtml(meeting.meeting_host)}</td>
        </tr>
    `).join('');
}

function initDashboardChart(projectStats) {
    const canvas = document.getElementById('projectChart');
    if (!canvas) return;
    
    const statsMap = { not_started: 0, in_progress: 0, finished: 0 };
    projectStats.forEach(stat => {
        if (statsMap[stat._id] !== undefined) statsMap[stat._id] = stat.count;
    });
    
    if (dashboardChart) dashboardChart.destroy();
    
    const ctx = canvas.getContext('2d');
    dashboardChart = new Chart(ctx, {
        type: 'bar',
        data: {
            // We keep these labels here so Chart.js knows how many bars to draw
            labels: ['Not Started', 'In Progress', 'Finished'],
            datasets: [{
                data: [statsMap.not_started, statsMap.in_progress, statsMap.finished],
                backgroundColor: ['#ffe0b5', '#b3e0ff', '#b0f7b6'],
                borderWidth: 2,
                borderColor: '#000000'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            layout: {
                padding: 0 // <-- ADD THIS to remove extra blank space around the edges
            },
            indexAxis: 'x',
            plugins: {
                legend: { display: false } 
            },
            scales: {
                x: {
                    ticks: {
                        display: false 
                    }
                },
                y: {
                    beginAtZero: true,
                    suggestedMax: 7, 
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
    
    const legendContainer = document.getElementById('chartLegend');
    if (legendContainer) {
        legendContainer.innerHTML = `
            <div class="legend-item"><div class="legend-color" style="background:#ffe0b5; width:15px; height:15px; display:inline-block; border: 2px solid black;"></div> <span>Not Started (${statsMap.not_started})</span></div>
            <div class="legend-item"><div class="legend-color" style="background:#b3e0ff; width:15px; height:15px; display:inline-block; border: 2px solid black;"></div> <span>In Progress (${statsMap.in_progress})</span></div>
            <div class="legend-item"><div class="legend-color" style="background:#b0f7b6; width:15px; height:15px; display:inline-block; border: 2px solid black;"></div> <span>Finished (${statsMap.finished})</span></div>
        `;
    }
}

// ==========================================
// TASK MODAL LOGIC 
// ==========================================

async function loadProjectsForDropdown() {
    const projectSelect = document.getElementById('taskProjectId');
    if (!projectSelect) return;

    try {
        const response = await fetchWithAuth('/projects'); 
        const projects = await response.json();

        if (projects.length === 0) {
            projectSelect.innerHTML = '<option value="">No projects found. Create one first!</option>';
            return;
        }

        projectSelect.innerHTML = '<option value="">-- Choose a Project --</option>' + 
            projects.map(p => `<option value="${p._id}">${escapeHtml(p.project_name)}</option>`).join('');
            
    } catch (error) {
        console.error('Error loading projects for dropdown:', error);
        projectSelect.innerHTML = '<option value="">Error loading projects</option>';
    }
}

async function openTaskModal(taskId = null) {
    const modal = document.getElementById('taskModal');
    const title = document.getElementById('taskModalTitle');
    const deleteBtn = document.getElementById('deleteTaskBtn');
    
    // Reset form first
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    if (deleteBtn) deleteBtn.style.display = 'none'; // Hide delete button by default
    
    // FETCH AND LOAD THE DROPDOWN BEFORE OPENING MODAL
    await loadProjectsForDropdown();
    
    if (taskId) {
        title.textContent = 'Edit Task';
        document.getElementById('taskId').value = taskId;
        if (deleteBtn) deleteBtn.style.display = 'block'; // Show delete button when editing
        
        // Fetch the existing task data to fill the form
        try {
            const response = await fetchWithAuth(`/tasks/${taskId}`);
            if (response.ok) {
                const task = await response.json();
                document.getElementById('taskName').value = task.task_name;
                
                // Handle the project ID
                const projId = typeof task.project_id === 'object' ? task.project_id._id : task.project_id;
                document.getElementById('taskProjectId').value = projId;
                
                // Format the date for the HTML input element
                if (task.due_date) {
                    const date = new Date(task.due_date);
                    document.getElementById('taskDueDate').value = date.toISOString().split('T')[0];
                }
            }
        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    } else {
        title.textContent = 'Add New Task';
    }
    
    modal.style.display = 'flex';
}

function closeTaskModal() {
    const modal = document.getElementById('taskModal');
    if (modal) modal.style.display = 'none';
}

async function handleTaskSubmit(e) {
    e.preventDefault();
    
    const taskId = document.getElementById('taskId').value;
    const projectSelect = document.getElementById('taskProjectId');
    
    if (!projectSelect.value) {
        alert("Please select a project first!");
        return;
    }
    
    const taskData = {
        task_name: document.getElementById('taskName').value,
        project_id: projectSelect.value, 
        due_date: document.getElementById('taskDueDate').value
    };
    
    // Only set status to not_started if it's a completely new task
    if (!taskId) {
        taskData.status = 'not_started';
    }
    
    const method = taskId ? 'PUT' : 'POST';
    const url = taskId ? `/tasks/${taskId}` : '/tasks';
    
    try {
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(taskData)
        });
        
        if (response.ok) {
            closeTaskModal();
            loadDashboardData(); // Refresh the dashboard!
        } else {
            const error = await response.json();
            alert(error.message || 'Error saving task');
        }
    } catch (error) {
        console.error('Error saving task:', error);
    }
}

// THIS FIXES THE "COMING SOON" ALERT!
window.editTask = async function(taskId) {
    openTaskModal(taskId);
};

window.markTaskDone = async function(taskId) {
    if (confirm('Mark this task as done?')) {
        try {
            const response = await fetchWithAuth(`/tasks/${taskId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: 'finished' }) 
            });
            if (response.ok) loadDashboardData(); // Refreshes and hides the task
        } catch (error) {
            console.error('Error marking task done:', error);
        }
    }
};

// Start the engine!
document.addEventListener('DOMContentLoaded', initDashboardPage);
// ============================================
// PROJECTS PAGE
// ============================================

// 1. ADDED: Declare the global variable so it doesn't crash

function initProjectsPage() {
    if (!checkAuth()) return; // Make sure checkAuth is defined in another file!
    
    // --- Global Search ---
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => searchProjects(e.target.value));
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout); // Make sure handleLogout exists
    
    const addBtn = document.getElementById('addProjectBtn');
    if (addBtn) addBtn.addEventListener('click', () => openProjectModal());
    
    const statusFilter = document.getElementById('statusFilter');
    const typeFilter = document.getElementById('typeFilter');
    if (statusFilter) statusFilter.addEventListener('change', filterProjects);
    if (typeFilter) typeFilter.addEventListener('change', filterProjects);
    
    const closeModalBtn = document.querySelector('#projectModal .close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeProjectModal());
    
    const cancelBtn = document.querySelector('#projectModal .cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeProjectModal());
    
    const projectForm = document.getElementById('projectForm');
    if (projectForm) projectForm.addEventListener('submit', handleProjectSubmit);
    
    // Profile editing
    const studentProfileBtn = document.getElementById('studentProfileBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    if (studentProfileBtn) studentProfileBtn.addEventListener('click', openEditProfileModal);
    if (editProfileForm) editProfileForm.addEventListener('submit', handleProfileUpdate);
    const closeProfileModalBtn = document.querySelector('.close-profile-modal');
    const cancelProfileBtn = document.querySelector('.cancel-profile-btn');
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeEditProfileModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeEditProfileModal);
    
    // Delete Account Handlers
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
    }
    
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', handleDeleteAccount);
    }
    
    const deleteConfirmCheckbox = document.getElementById('deleteConfirmCheckbox');
    if (deleteConfirmCheckbox) {
        deleteConfirmCheckbox.addEventListener('change', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const password = document.getElementById('deletePassword').value;
            if (confirmBtn) {
                confirmBtn.disabled = !(deleteConfirmCheckbox.checked && password);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const deletePassword = document.getElementById('deletePassword');
    if (deletePassword) {
        deletePassword.addEventListener('input', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const checkbox = document.getElementById('deleteConfirmCheckbox');
            if (confirmBtn) {
                confirmBtn.disabled = !(checkbox.checked && deletePassword.value);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const closeDeleteModalBtn = document.querySelector('.close-delete-modal');
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    const cancelDeleteBtn = document.querySelector('.cancel-delete-btn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    // Initialize notifications on this page
    initNotifications();
    
    loadProjects();
}

async function loadProjects() {
    try {
        const response = await fetchWithAuth('/projects');
        currentProjects = await response.json();
        displayProjects(currentProjects);
    } catch (error) {
        console.error('Error loading projects:', error);
        const tbody = document.getElementById('projectsTableBody');
        if (tbody) tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Failed to load projects</td></tr>';
    }
}

function displayProjects(projects) {
    const tbody = document.getElementById('projectsTableBody');
    if (!tbody) return;
    
    if (projects.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No projects found. Click "Add New Project" to get started!</td></tr>';
        return;
    }
    
    tbody.innerHTML = projects.map(project => `
        <tr>
            <td>${escapeHtml(project.project_name)}</td>
            <td>${escapeHtml(project.adviser)}</td>
            <td>${formatProjectType(project.type_of_project)}</td>
            <td>${formatDate(project.deadline)}</td>
            <td><span class="status-badge status-${project.status?.replace(/_/g, '-')}">${formatStatus(project.status)}</span></td>
            <td>${project.percentage_complete || 0}%</td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="editProject('${project._id}')">EDIT</button>
                <button class="action-btn delete-btn" onclick="deleteProject('${project._id}')">DELETE</button>
                <button class="action-btn mark-btn" onclick="updateProjectStatus('${project._id}')">MARK</button>
            </td>
        </tr>
    `).join('');
}

function filterProjects() {
    const statusFilter = document.getElementById('statusFilter')?.value || 'all';
    const typeFilter = document.getElementById('typeFilter')?.value || 'all';
    
    let filtered = [...currentProjects];
    if (statusFilter !== 'all') filtered = filtered.filter(p => p.status === statusFilter);
    if (typeFilter !== 'all') filtered = filtered.filter(p => (p.type_of_project || '').toLowerCase() === typeFilter.toLowerCase());
    
    displayProjects(filtered);
}

function openProjectModal(project = null) {
    const modal = document.getElementById('projectModal');
    const title = document.getElementById('modalTitle');
    const projectId = document.getElementById('projectId');
    const projectName = document.getElementById('projectName');
    const adviser = document.getElementById('adviser');
    const projectType = document.getElementById('projectType');
    const deadline = document.getElementById('deadline');
    const projectStatus = document.getElementById('projectStatus');
    const percentageComplete = document.getElementById('percentageComplete');
    
    if (project) {
        title.textContent = 'Edit Project';
        projectId.value = project._id;
        projectName.value = project.project_name;
        adviser.value = project.adviser;
        projectType.value = project.type_of_project;
        deadline.value = project.deadline?.split('T')[0] || '';
        projectStatus.value = project.status;
        percentageComplete.value = project.percentage_complete || 0;
    } else {
        title.textContent = 'Add New Project';
        projectId.value = '';
        document.getElementById('projectForm').reset();
    }
    
    modal.style.display = 'flex';
}

function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    modal.style.display = 'none';
    document.getElementById('projectForm').reset();
}

async function handleProjectSubmit(e) {
    e.preventDefault();
    
    const projectId = document.getElementById('projectId').value;
    const formData = {
        project_name: document.getElementById('projectName').value,
        adviser: document.getElementById('adviser').value,
        type_of_project: document.getElementById('projectType').value,
        deadline: document.getElementById('deadline').value,
        status: document.getElementById('projectStatus').value,
        percentage_complete: parseInt(document.getElementById('percentageComplete').value) || 0
    };
    
    const method = projectId ? 'PUT' : 'POST';
    const url = projectId ? `/projects/${projectId}` : '/projects';
    
    try {
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(formData) });
        
        if (response.ok) {
            closeProjectModal();
            loadProjects();
            alert(projectId ? 'Project updated!' : 'Project added!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error saving project');
        }
    } catch (error) {
        console.error('Error saving project:', error);
        alert('Error saving project');
    }
}

window.editProject = async function(projectId) {
    const project = currentProjects.find(p => p._id === projectId);
    if (project) openProjectModal(project);
};

window.deleteProject = async function(projectId) {
    if (confirm('Are you sure you want to delete this project?')) {
        try {
            const response = await fetchWithAuth(`/projects/${projectId}`, { method: 'DELETE' });
            if (response.ok) {
                loadProjects();
                alert('Project deleted!');
            } else {
                alert('Error deleting project');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Error deleting project');
        }
    }
};

window.updateProjectStatus = async function(projectId) {
    const newStatus = prompt('Enter new status (not_started, in_progress, finished):');
    if (newStatus && ['not_started', 'in_progress', 'finished'].includes(newStatus)) {
        try {
            const response = await fetchWithAuth(`/projects/${projectId}`, {
                method: 'PUT',
                body: JSON.stringify({ status: newStatus })
            });
            if (response.ok) loadProjects();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    }
};

// 2. ADDED: This is the trigger that actually starts all your code when the page loads!
document.addEventListener('DOMContentLoaded', initProjectsPage);
// ============================================
// MEETINGS PAGE
// ============================================

// 1. ADDED: Declare the global variable so it doesn't crash

function initMeetingsPage() {
    if (!checkAuth()) return;
    
    // --- Global Search ---
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => searchMeetings(e.target.value));
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const addBtn = document.getElementById('addMeetingBtn');
    if (addBtn) addBtn.addEventListener('click', () => openMeetingModal());
    
    const statusFilter = document.getElementById('meetingStatusFilter');
    const sortFilter = document.getElementById('meetingSort');
    if (statusFilter) statusFilter.addEventListener('change', loadMeetings);
    if (sortFilter) sortFilter.addEventListener('change', loadMeetings);
    
    const closeModalBtn = document.querySelector('#meetingModal .close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => closeMeetingModal());
    
    const cancelBtn = document.querySelector('#meetingModal .cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => closeMeetingModal());
    
    const meetingForm = document.getElementById('meetingForm');
    if (meetingForm) meetingForm.addEventListener('submit', handleMeetingSubmit);
    
    // Profile editing
    const studentProfileBtn = document.getElementById('studentProfileBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    if (studentProfileBtn) studentProfileBtn.addEventListener('click', openEditProfileModal);
    if (editProfileForm) editProfileForm.addEventListener('submit', handleProfileUpdate);
    const closeProfileModalBtn = document.querySelector('.close-profile-modal');
    const cancelProfileBtn = document.querySelector('.cancel-profile-btn');
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeEditProfileModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeEditProfileModal);
    
    // Delete Account Handlers
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
    }
    
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', handleDeleteAccount);
    }
    
    const deleteConfirmCheckbox = document.getElementById('deleteConfirmCheckbox');
    if (deleteConfirmCheckbox) {
        deleteConfirmCheckbox.addEventListener('change', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const password = document.getElementById('deletePassword').value;
            if (confirmBtn) {
                confirmBtn.disabled = !(deleteConfirmCheckbox.checked && password);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const deletePassword = document.getElementById('deletePassword');
    if (deletePassword) {
        deletePassword.addEventListener('input', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const checkbox = document.getElementById('deleteConfirmCheckbox');
            if (confirmBtn) {
                confirmBtn.disabled = !(checkbox.checked && deletePassword.value);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const closeDeleteModalBtn = document.querySelector('.close-delete-modal');
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    const cancelDeleteBtn = document.querySelector('.cancel-delete-btn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    // Initialize notifications on this page
    initNotifications();
    
    loadMeetings();
}

async function loadMeetings() {
    const statusFilter = document.getElementById('meetingStatusFilter')?.value || 'all';
    const sortFilter = document.getElementById('meetingSort')?.value || 'nearest';
    
    try {
        const response = await fetchWithAuth(`/meetings?status=${statusFilter}&sort=${sortFilter}`);
        currentMeetings = await response.json();
        displayMeetings(currentMeetings);
    } catch (error) {
        console.error('Error loading meetings:', error);
    }
}

function displayMeetings(meetings) {
    const tbody = document.getElementById('meetingsTableBody');
    if (!tbody) return;
    
    if (meetings.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No meetings scheduled. Click "Schedule Meeting" to add one!</td></tr>';
        return;
    }
    
    tbody.innerHTML = meetings.map(meeting => `
        <tr>
            <td>${escapeHtml(meeting.meeting_name)}</td>
            <td>${formatDateTime(meeting.meeting_date_time)}</td>
            <td>${escapeHtml(meeting.meeting_host)}</td>
            <td>${escapeHtml(meeting.student_role)}</td>
            <td><span class="status-badge status-${meeting.status}">${formatStatus(meeting.status)}</span></td>
            <td class="action-buttons">
                <button class="action-btn edit-btn" onclick="editMeeting('${meeting._id}')">EDIT</button>
                <button class="action-btn delete-btn" onclick="cancelMeeting('${meeting._id}')">CANCEL</button>
                <button class="action-btn mark-btn" onclick="markMeetingDone('${meeting._id}')">DONE</button>
            </td>
        </tr>
    `).join('');
}

function openMeetingModal(meeting = null) {
    const modal = document.getElementById('meetingModal');
    const title = document.getElementById('modalTitle');
    const meetingId = document.getElementById('meetingId');
    const meetingName = document.getElementById('meetingName');
    const meetingDateTime = document.getElementById('meetingDateTime');
    const meetingHost = document.getElementById('meetingHost');
    const studentRole = document.getElementById('studentRole');
    const meetingStatus = document.getElementById('meetingStatus');
    
    if (meeting) {
        title.textContent = 'Edit Meeting';
        meetingId.value = meeting._id;
        meetingName.value = meeting.meeting_name;
        const date = new Date(meeting.meeting_date_time);
        meetingDateTime.value = date.toISOString().slice(0, 16);
        meetingHost.value = meeting.meeting_host;
        studentRole.value = meeting.student_role;
        meetingStatus.value = meeting.status;
    } else {
        title.textContent = 'Schedule Meeting';
        meetingId.value = '';
        document.getElementById('meetingForm').reset();
    }
    
    modal.style.display = 'flex';
}

function closeMeetingModal() {
    const modal = document.getElementById('meetingModal');
    modal.style.display = 'none';
    document.getElementById('meetingForm').reset();
}

async function handleMeetingSubmit(e) {
    e.preventDefault();
    
    const meetingId = document.getElementById('meetingId').value;
    const dateTimeLocal = document.getElementById('meetingDateTime').value; 
    
    let dateTimeISO = new Date().toISOString();
    
    if (dateTimeLocal) {
        const [datePart, timePart] = dateTimeLocal.split('T');
        const [year, month, day] = datePart.split('-');
        const [hours, minutes] = timePart.split(':');
        
        const localDate = new Date(year, month - 1, day, hours, minutes, 0);
        dateTimeISO = localDate.toISOString();
    }
    
    const formData = {
        meeting_name: document.getElementById('meetingName').value,
        meeting_date_time: dateTimeISO,
        meeting_host: document.getElementById('meetingHost').value,
        student_role: document.getElementById('studentRole').value,
        status: document.getElementById('meetingStatus').value
    };
    
    const method = meetingId ? 'PUT' : 'POST';
    const url = meetingId ? `/meetings/${meetingId}` : '/meetings';
    
    try {
        const response = await fetchWithAuth(url, { method, body: JSON.stringify(formData) });
        
        if (response.ok) {
            closeMeetingModal();
            loadMeetings();
            alert(meetingId ? 'Meeting updated!' : 'Meeting scheduled!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error saving meeting');
        }
    } catch (error) {
        console.error('Error saving meeting:', error);
        alert('Error saving meeting');
    }
}

window.editMeeting = async function(meetingId) {
    const meeting = currentMeetings.find(m => m._id === meetingId);
    if (meeting) openMeetingModal(meeting);
};

window.cancelMeeting = async function(meetingId) {
    if (confirm('Are you sure you want to cancel this meeting?')) {
        try {
            const response = await fetchWithAuth(`/meetings/${meetingId}`, { method: 'DELETE' });
            if (response.ok) {
                loadMeetings();
                alert('Meeting canceled!');
            }
        } catch (error) {
            console.error('Error canceling meeting:', error);
        }
    }
};

window.markMeetingDone = async function(meetingId) {
    try {
        const response = await fetchWithAuth(`/meetings/${meetingId}`, {
            method: 'PUT',
            body: JSON.stringify({ status: 'done' })
        });
        if (response.ok) loadMeetings();
    } catch (error) {
        console.error('Error marking meeting:', error);
    }
};

// 2. ADDED: Tell the browser to run your init function when the page loads
document.addEventListener('DOMContentLoaded', initMeetingsPage);

// ============================================
// CALENDAR PAGE
// ============================================
let currentCalendarDate = new Date();
let calendarProjects = [];

function initCalendarPage() {
    if (!checkAuth()) return;
    
    // --- Global Search ---
    const globalSearch = document.getElementById('globalSearch');
    if (globalSearch) {
        globalSearch.addEventListener('input', (e) => searchCalendar(e.target.value));
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    
    const prevBtn = document.getElementById('prevMonthBtn');
    const nextBtn = document.getElementById('nextMonthBtn');
    if (prevBtn) prevBtn.addEventListener('click', () => changeMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changeMonth(1));
    
    const closeDetailsBtn = document.querySelector('.close-details');
    if (closeDetailsBtn) {
        closeDetailsBtn.addEventListener('click', () => {
            document.getElementById('selectedDayDetails').style.display = 'none';
        });
    }
    
    // Profile editing
    const studentProfileBtn = document.getElementById('studentProfileBtn');
    const editProfileForm = document.getElementById('editProfileForm');
    if (studentProfileBtn) studentProfileBtn.addEventListener('click', openEditProfileModal);
    if (editProfileForm) editProfileForm.addEventListener('submit', handleProfileUpdate);
    const closeProfileModalBtn = document.querySelector('.close-profile-modal');
    const cancelProfileBtn = document.querySelector('.cancel-profile-btn');
    if (closeProfileModalBtn) closeProfileModalBtn.addEventListener('click', closeEditProfileModal);
    if (cancelProfileBtn) cancelProfileBtn.addEventListener('click', closeEditProfileModal);
    
    // Delete Account Handlers
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
    }
    
    const deleteAccountForm = document.getElementById('deleteAccountForm');
    if (deleteAccountForm) {
        deleteAccountForm.addEventListener('submit', handleDeleteAccount);
    }
    
    const deleteConfirmCheckbox = document.getElementById('deleteConfirmCheckbox');
    if (deleteConfirmCheckbox) {
        deleteConfirmCheckbox.addEventListener('change', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const password = document.getElementById('deletePassword').value;
            if (confirmBtn) {
                confirmBtn.disabled = !(deleteConfirmCheckbox.checked && password);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const deletePassword = document.getElementById('deletePassword');
    if (deletePassword) {
        deletePassword.addEventListener('input', () => {
            const confirmBtn = document.getElementById('confirmDeleteBtn');
            const checkbox = document.getElementById('deleteConfirmCheckbox');
            if (confirmBtn) {
                confirmBtn.disabled = !(checkbox.checked && deletePassword.value);
                confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            }
        });
    }
    
    const closeDeleteModalBtn = document.querySelector('.close-delete-modal');
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    const cancelDeleteBtn = document.querySelector('.cancel-delete-btn');
    if (cancelDeleteBtn) {
        cancelDeleteBtn.addEventListener('click', closeDeleteAccountModal);
    }
    
    // Initialize notifications on this page
    initNotifications();
    
    loadCalendarProjects();
}

async function loadCalendarProjects() {
    try {
        const response = await fetchWithAuth('/projects');
        calendarProjects = await response.json();
        generateCalendar(currentCalendarDate);
    } catch (error) {
        console.error('Error loading calendar:', error);
        const calendarGrid = document.getElementById('calendarGrid');
        if (calendarGrid) calendarGrid.innerHTML = '<div class="empty-state">Failed to load calendar</div>';
    }
}

function generateCalendar(date) {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthYearEl = document.getElementById('currentMonthYear');
    
    if (!calendarGrid) return;
    
    const year = date.getFullYear();
    const month = date.getMonth();
    
    if (monthYearEl) {
        monthYearEl.textContent = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    calendarGrid.innerHTML = '';
    
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
        const dayNumber = prevMonthDays - i;
        calendarGrid.appendChild(createCalendarDay(dayNumber, year, month - 1, true));
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        calendarGrid.appendChild(createCalendarDay(day, year, month, false));
    }
    
    // Next month days
    const totalCells = 42;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        calendarGrid.appendChild(createCalendarDay(day, year, month + 1, true));
    }
}

function showDayDetails(dateString) {
    const projectsOnDate = calendarProjects.filter(p => {
        const projectDate = new Date(p.deadline).toISOString().split('T')[0];
        return projectDate === dateString;
    });
    
    const selectedDateEl = document.getElementById('selectedDate');
    const detailsContent = document.getElementById('dayDetailsContent');
    const detailsPanel = document.getElementById('selectedDayDetails');
    
    if (selectedDateEl) selectedDateEl.textContent = formatDate(dateString);
    
    if (projectsOnDate.length === 0) {
        detailsContent.innerHTML = '<p class="empty-state">No deadlines on this day</p>';
    } else {
        detailsContent.innerHTML = `
            <div class="table-container">
                <table>
                    <thead><tr><th>Project Name</th><th>Adviser</th><th>Status</th></tr></thead>
                    <tbody>
                        ${projectsOnDate.map(p => `
                            <tr>
                                <td>${escapeHtml(p.project_name)}</td>
                                <td>${escapeHtml(p.adviser)}</td>
                                <td><span class="status-badge status-${p.status?.replace(/_/g, '-')}">${formatStatus(p.status)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }
    
    detailsPanel.style.display = 'block';
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    generateCalendar(currentCalendarDate);
}

// THE MISSING FIX: Start the engine!
document.addEventListener('DOMContentLoaded', initCalendarPage);

// ============================================
// SEARCH FUNCTIONALITY
// ============================================

// Search function for Dashboard - searches tasks and projects
function searchDashboard(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
        // If search is cleared, reload original data
        loadDashboardData();
        return;
    }
    
    // Filter tasks
    const tasksTableBody = document.getElementById('tasksTableBody');
    if (tasksTableBody && dashboardTasks) {
        const filteredTasks = dashboardTasks.filter(task => 
            task.task_name?.toLowerCase().includes(searchTerm) ||
            task.project_id?.project_name?.toLowerCase().includes(searchTerm)
        );
        
        if (filteredTasks.length === 0) {
            tasksTableBody.innerHTML = '<tr><td colspan="5" class="empty-state">No tasks match your search</td></tr>';
        } else {
            tasksTableBody.innerHTML = filteredTasks.map(task => `
                <tr>
                    <td>${escapeHtml(task.task_name)}</td>
                    <td>${escapeHtml(task.project_id?.project_name || 'Unknown')}</td>
                    <td>${formatDate(task.due_date)}</td>
                    <td><span class="status-badge status-${task.status?.replace(/_/g, '-') || 'not-started'}">${formatStatus(task.status)}</span></td>
                    <td class="action-buttons">
                        <button class="action-btn edit-btn" onclick="editTask('${task._id}')">EDIT</button>
                        <button class="action-btn mark-btn" onclick="markTaskDone('${task._id}')">DONE</button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

// Search function for Projects page
function searchProjects(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
        displayProjects(currentProjects);
        return;
    }
    
    const filteredProjects = currentProjects.filter(project =>
        project.project_name?.toLowerCase().includes(searchTerm) ||
        project.adviser?.toLowerCase().includes(searchTerm) ||
        project.type_of_project?.toLowerCase().includes(searchTerm)
    );
    
    displayProjects(filteredProjects);
}

// Search function for Meetings page
function searchMeetings(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
        displayMeetings(currentMeetings);
        return;
    }
    
    const filteredMeetings = currentMeetings.filter(meeting =>
        meeting.meeting_name?.toLowerCase().includes(searchTerm) ||
        meeting.meeting_host?.toLowerCase().includes(searchTerm) ||
        meeting.student_role?.toLowerCase().includes(searchTerm)
    );
    
    displayMeetings(filteredMeetings);
}

// Search function for Calendar page
function searchCalendar(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
        generateCalendar(currentCalendarDate);
        return;
    }
    
    const filteredProjects = calendarProjects.filter(project =>
        project.project_name?.toLowerCase().includes(searchTerm) ||
        project.adviser?.toLowerCase().includes(searchTerm)
    );
    
    // Show only calendar days with filtered projects
    const calendarGrid = document.getElementById('calendarGrid');
    if (!calendarGrid) return;
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    calendarGrid.innerHTML = '';
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    
    // Previous month days
    for (let i = startDay - 1; i >= 0; i--) {
        const dayNumber = prevMonthDays - i;
        calendarGrid.appendChild(createCalendarDay(dayNumber, year, month - 1, true, filteredProjects));
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
        calendarGrid.appendChild(createCalendarDay(day, year, month, false, filteredProjects));
    }
    
    // Next month days
    const totalCells = 42;
    const remainingCells = totalCells - (startDay + daysInMonth);
    for (let day = 1; day <= remainingCells; day++) {
        calendarGrid.appendChild(createCalendarDay(day, year, month + 1, true, filteredProjects));
    }
}

// Modified createCalendarDay to accept filtered projects
function createCalendarDay(day, year, month, isOtherMonth, projectsToShow = null) {
    const dayDiv = document.createElement('div');
    dayDiv.className = 'calendar-day';
    if (isOtherMonth) dayDiv.style.opacity = '0.4';
    
    const dateObj = new Date(year, month, day);
    const dateString = dateObj.toISOString().split('T')[0];
    
    // Check if this is today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    if (dateString === todayString) {
        dayDiv.style.backgroundColor = '#e0f0ff';
        dayDiv.style.borderRadius = '8px';
        dayDiv.style.border = '2px solid #4a90e2';
        dayDiv.style.fontWeight = 'bold';
    }
    
    const projectsToCheck = projectsToShow !== null ? projectsToShow : calendarProjects;
    const deadlineCount = projectsToCheck.filter(p => {
        const projectDate = new Date(p.deadline).toISOString().split('T')[0];
        return projectDate === dateString;
    }).length;
    
    let deadlineClass = 'deadline-0';
    let deadlineText = 'NONE';
    
    if (deadlineCount === 1) {
        deadlineClass = 'deadline-1';
        deadlineText = '1 DEADLINE';
    } else if (deadlineCount === 2) {
        deadlineClass = 'deadline-2';
        deadlineText = '2 DEADLINES';
    } else if (deadlineCount >= 3) {
        deadlineClass = 'deadline-3';
        deadlineText = '3+ DEADLINES';
    }
    
    dayDiv.innerHTML = `
        <div class="calendar-day-number">${day}</div>
        <div class="deadline-count ${deadlineClass}">${deadlineText}</div>
    `;
    
    dayDiv.addEventListener('click', () => showDayDetails(dateString));
    
    return dayDiv;
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

function openEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (!modal) return;
    
    // Populate form with current data
    document.getElementById('editFirstName').value = currentStudent.first_name || '';
    document.getElementById('editLastName').value = currentStudent.last_name || '';
    document.getElementById('editCourse').value = currentStudent.course || '';
    
    modal.style.display = 'flex';
}

function closeEditProfileModal() {
    const modal = document.getElementById('editProfileModal');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('editProfileForm').reset();
    }
}

async function handleProfileUpdate(e) {
    e.preventDefault();
    
    const firstName = document.getElementById('editFirstName').value.trim();
    const lastName = document.getElementById('editLastName').value.trim();
    const course = document.getElementById('editCourse').value.trim();
    
    if (!firstName || !lastName || !course) {
        alert('All fields are required');
        return;
    }
    
    const submitBtn = document.querySelector('#editProfileForm .save-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Saving...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetchWithAuth('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify({
                first_name: firstName,
                last_name: lastName,
                course: course
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            
            // Update local student data
            currentStudent.first_name = data.student.first_name;
            currentStudent.last_name = data.student.last_name;
            currentStudent.full_name = data.student.full_name;
            currentStudent.course = data.student.course;
            
            // Save updated data to localStorage
            localStorage.setItem('studentData', JSON.stringify(currentStudent));
            
            // Update UI
            updateUserInterface();
            
            // Close modal
            closeEditProfileModal();
            
            alert('Profile updated successfully!');
        } else {
            const error = await response.json();
            alert(error.message || 'Error updating profile');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        alert('Error updating profile. Please try again.');
    } finally {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

function openDeleteAccountModal() {
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    if (deleteAccountModal) {
        deleteAccountModal.style.display = 'flex';
    }
}

function closeDeleteAccountModal() {
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    if (deleteAccountModal) {
        deleteAccountModal.style.display = 'none';
    }
    // Reset form
    document.getElementById('deleteAccountForm').reset();
    document.getElementById('confirmDeleteBtn').disabled = true;
}

async function handleDeleteAccount(e) {
    e.preventDefault();
    
    const password = document.getElementById('deletePassword').value;
    const confirmCheckbox = document.getElementById('deleteConfirmCheckbox').checked;
    
    if (!password || !confirmCheckbox) {
        alert('Please enter your password and confirm the action');
        return;
    }
    
    const confirmBtn = document.getElementById('confirmDeleteBtn');
    const originalText = confirmBtn.textContent;
    confirmBtn.textContent = 'Deleting...';
    confirmBtn.disabled = true;
    
    try {
        const response = await fetchWithAuth('/auth/account', {
            method: 'DELETE',
            body: JSON.stringify({ password })
        });
        
        if (response.ok) {
            alert('Account deleted successfully. You will be logged out.');
            
            // Clear localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('studentData');
            
            // Redirect to login
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            const error = await response.json();
            alert(error.message || 'Error deleting account');
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error deleting account:', error);
        alert('Error deleting account. Please try again.');
        confirmBtn.textContent = originalText;
        confirmBtn.disabled = false;
    }
}

// ============================================
// NOTIFICATION SYSTEM
// ============================================

async function updateNotifications() {
    try {
        // Fetch all relevant data
        const tasksResponse = await fetchWithAuth('/dashboard');
        const meetingsResponse = await fetchWithAuth('/meetings');
        const projectsResponse = await fetchWithAuth('/projects');
        
        const dashboardData = await tasksResponse.json();
        const meetings = await meetingsResponse.json();
        const projects = await projectsResponse.json();
        
        let notifications = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get upcoming tasks (due in next 7 days)
        const tasks = dashboardData.tasks || [];
        tasks.forEach(task => {
            if (task.status !== 'finished') {
                const dueDate = new Date(task.due_date);
                dueDate.setHours(0, 0, 0, 0);
                const daysUntilDue = (dueDate - today) / (1000 * 60 * 60 * 24);

                if (daysUntilDue >= 0 && daysUntilDue <= 7) {
                    const urgencyLabel = daysUntilDue === 0 ? 'Due TODAY' : `Due in ${Math.ceil(daysUntilDue)} day${Math.ceil(daysUntilDue) !== 1 ? 's' : ''}`;
                    notifications.push({
                        type: 'task',
                        title: task.task_name,
                        info: urgencyLabel,
                        dueDate: dueDate.getTime(),
                        project: task.project_id?.project_name || 'Unknown'
                    });
                }
            }
        });
        
        // Get upcoming meetings (next 7 days)
        meetings.forEach(meeting => {
            if (meeting.status !== 'done' && meeting.status !== 'canceled') {
                const meetingDate = new Date(meeting.meeting_date_time);
                const meetingDayDate = new Date(meetingDate);
                meetingDayDate.setHours(0, 0, 0, 0);
                const daysUntilMeeting = (meetingDayDate - today) / (1000 * 60 * 60 * 24);

                if (daysUntilMeeting >= 0 && daysUntilMeeting <= 7) {
                    const timeString = meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    const daysLabel = daysUntilMeeting === 0 ? 'TODAY' : `in ${Math.ceil(daysUntilMeeting)} day${Math.ceil(daysUntilMeeting) !== 1 ? 's' : ''}`;
                    notifications.push({
                        type: 'meeting',
                        title: meeting.meeting_name,
                        info: `${daysLabel} at ${timeString}`,
                        dueDate: meetingDate.getTime(),
                        host: meeting.meeting_host
                    });
                }
            }
        });
        
        // Get upcoming project deadlines (next 7 days)
        projects.forEach(project => {
            if (project.status !== 'finished') {
                const deadline = new Date(project.deadline);
                deadline.setHours(0, 0, 0, 0);
                const daysUntilDeadline = (deadline - today) / (1000 * 60 * 60 * 24);

                if (daysUntilDeadline >= 0 && daysUntilDeadline <= 7) {
                    const daysLabel = daysUntilDeadline === 0 ? 'Due TODAY' : `Due in ${Math.ceil(daysUntilDeadline)} day${Math.ceil(daysUntilDeadline) !== 1 ? 's' : ''}`;
                    notifications.push({
                        type: 'project',
                        title: project.project_name,
                        info: daysLabel,
                        dueDate: deadline.getTime(),
                        adviser: project.adviser
                    });
                }
            }
        });
        
        // Sort by due date (earliest first)
        notifications.sort((a, b) => a.dueDate - b.dueDate);
        
        // Update badge count
        const notificationCount = document.getElementById('notificationCount');
        if (notificationCount) {
            notificationCount.textContent = notifications.length;
            notificationCount.style.display = notifications.length > 0 ? 'block' : 'none';
        }
        
        // Update notification list
        displayNotifications(notifications);
        
    } catch (error) {
        console.error('Error updating notifications:', error);
    }
}

function displayNotifications(notifications) {
    const notificationList = document.getElementById('notificationList');
    if (!notificationList) return;
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<p class="empty-notification">No upcoming due dates or events</p>';
        return;
    }
    
    notificationList.innerHTML = notifications.map(notif => `
        <div class="notification-item">
            <span class="notification-item-title">${escapeHtml(notif.title)}</span>
            <span class="notification-item-info">${escapeHtml(notif.info)}</span>
            <span class="notification-item-type ${notif.type}">${notif.type.toUpperCase()}</span>
        </div>
    `).join('');
}

// Initialize notifications - can be called on any page
let notificationsInitialized = false;
function initNotifications() {
    if (notificationsInitialized) return; // Only initialize once
    notificationsInitialized = true;
    
    const notificationsContainer = document.getElementById('notificationsContainer');
    const notificationDropdown = document.getElementById('notificationDropdown');
    const notificationCloseBtn = document.querySelector('.notification-close');
    
    if (notificationsContainer && notificationDropdown) {
        // Toggle dropdown on bell icon click
        notificationsContainer.addEventListener('click', (e) => {
            e.stopPropagation();
            notificationDropdown.classList.toggle('show');
        });
        
        // Close button click handler
        if (notificationCloseBtn) {
            notificationCloseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                notificationDropdown.classList.remove('show');
            });
        }
        
        // Close notification dropdown when clicking elsewhere
        document.addEventListener('click', (e) => {
            if (!notificationsContainer.contains(e.target)) {
                notificationDropdown.classList.remove('show');
            }
        });
    }
    
    // Load initial notifications
    updateNotifications();
    
    // Refresh notifications every 30 seconds
    setInterval(updateNotifications, 30000);
}

function closeNotificationDropdown() {
    const notificationDropdown = document.getElementById('notificationDropdown');
    if (notificationDropdown) {
        notificationDropdown.classList.remove('show');
    }
}

// ============================================
// MODAL FUNCTIONS FOR DASHBOARD DROPDOWN
// ============================================

async function showProjectOverviewModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="projectOverviewPopup" class="modal" style="display: flex;">
            <div class="modal-content overview-modal">
                <div class="modal-header">
                    <h2>My Project Overview</h2>
                    <button class="close-btn" onclick="closeProjectOverviewModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Project Name</th>
                                    <th>Adviser</th>
                                    <th>Status</th>
                                    <th>Completion %</th>
                                </tr>
                            </thead>
                            <tbody id="projectOverviewTableBody">
                                <tr><td colspan="4" class="empty-state">Loading projects...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="primary-btn" onclick="closeProjectOverviewModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove any existing modal
    const existingModal = document.getElementById('projectOverviewPopup');
    if (existingModal) existingModal.remove();
    
    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load projects data
    try {
        const response = await fetchWithAuth('/projects');
        const projects = await response.json();
        
        const tbody = document.getElementById('projectOverviewTableBody');
        if (projects.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No projects found</td></tr>';
        } else {
            tbody.innerHTML = projects.map(project => `
                <tr>
                    <td>${escapeHtml(project.project_name)}</td>
                    <td>${escapeHtml(project.adviser)}</td>
                    <td><span class="status-badge status-${project.status?.replace(/_/g, '-')}">${formatStatus(project.status)}</span></td>
                    <td>${project.percentage_complete || 0}%</td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        const tbody = document.getElementById('projectOverviewTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Error loading projects</td></tr>';
    }
    
    // Close on backdrop click
    const modal = document.getElementById('projectOverviewPopup');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeProjectOverviewModal();
    });
}

function closeProjectOverviewModal() {
    const modal = document.getElementById('projectOverviewPopup');
    if (modal) modal.remove();
}

async function showUpcomingMeetingsModal() {
    // Create modal HTML
    const modalHTML = `
        <div id="upcomingMeetingsPopup" class="modal" style="display: flex;">
            <div class="modal-content overview-modal">
                <div class="modal-header">
                    <h2>Upcoming Meetings</h2>
                    <button class="close-btn" onclick="closeUpcomingMeetingsModal()">✕</button>
                </div>
                <div class="modal-body">
                    <div class="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Meeting Name</th>
                                    <th>Date & Time</th>
                                    <th>Host</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody id="upcomingMeetingsTableBody">
                                <tr><td colspan="4" class="empty-state">Loading meetings...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="primary-btn" onclick="closeUpcomingMeetingsModal()">Close</button>
                </div>
            </div>
        </div>
    `;
    
    const existingModal = document.getElementById('upcomingMeetingsPopup');
    if (existingModal) existingModal.remove();
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Load meetings data
    try {
        const response = await fetchWithAuth('/meetings');
        const meetings = await response.json();
        
        // Filter for upcoming meetings (not done/canceled)
        const upcomingMeetings = meetings.filter(m => m.status !== 'done' && m.status !== 'canceled');
        
        const tbody = document.getElementById('upcomingMeetingsTableBody');
        if (upcomingMeetings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No upcoming meetings</td></tr>';
        } else {
            tbody.innerHTML = upcomingMeetings.map(meeting => `
                <tr>
                    <td>${escapeHtml(meeting.meeting_name)}</td>
                    <td>${formatDateTime(meeting.meeting_date_time)}</td>
                    <td>${escapeHtml(meeting.meeting_host)}</td>
                    <td><span class="status-badge status-${meeting.status}">${formatStatus(meeting.status)}</span></td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading meetings:', error);
        const tbody = document.getElementById('upcomingMeetingsTableBody');
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">Error loading meetings</td></tr>';
    }
    
    // Close on backdrop click
    const modal = document.getElementById('upcomingMeetingsPopup');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeUpcomingMeetingsModal();
    });
}

function closeUpcomingMeetingsModal() {
    const modal = document.getElementById('upcomingMeetingsPopup');
    if (modal) modal.remove();
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDateTime(dateTimeString) {
    if (!dateTimeString) return 'N/A';
    const date = new Date(dateTimeString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatStatus(status) {
    const statusMap = {
        'not_started': 'NOT STARTED',
        'in_progress': 'IN PROGRESS',
        'finished': 'FINISHED',
        'scheduled': 'SCHEDULED',
        'done': 'DONE',
        'canceled': 'CANCELED'
    };
    return statusMap[status] || (status || '').toUpperCase();
}

function formatProjectType(type) {
    if (!type) return '';

    // Predefined type mappings (now normal capitalization)
    const typeMap = {
        'thesis': 'Thesis',
        'capstone': 'Capstone',
        'research': 'Research Paper',
        'case_study': 'Case Study'
    };

    // For custom types, format with title case only
    return type
        .split(/[\s-_]+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}