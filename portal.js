/* ==========================================================================
   PORTAL LOGIC & LOCAL PERSISTENCE SYSTEM (VANILLA JS)
   ========================================================================== */

// Global State
let currentRole = 'student'; // 'student' or 'admin'
let loggedInUser = null; // Holds user object
let loadedInquiries = []; // Cache loaded inquiries
let loadedDoubts = []; // Cache loaded doubts

// Pre-seeded database keys in localStorage if empty - NOT NEEDED
const DB_KEYS = {};

// Seed initial dummy data if they don't exist in localStorage - empty backend handles it
function seedInitialData() {}

// Run Seeder on Load
document.addEventListener('DOMContentLoaded', () => {
    seedInitialData();
    setupAuthListeners();
    setupDashboardDate();
});

// Set current dates in headers
function setupDashboardDate() {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = new Date().toLocaleDateString('en-US', options);
    
    const adminDateEl = document.getElementById('adminCurrentDate');
    const studentDateEl = document.getElementById('studentCurrentDate');
    if (adminDateEl) adminDateEl.textContent = dateStr;
    if (studentDateEl) studentDateEl.textContent = dateStr;
}

// ==========================================
// 1. AUTHENTICATION & REGISTRATION
// ==========================================
function switchLoginRole(role) {
    currentRole = role;
    const btnStudent = document.getElementById('btnStudentRole');
    const btnAdmin = document.getElementById('btnAdminRole');
    const registerPrompt = document.getElementById('registerPrompt');
    const credentialsTip = document.getElementById('credentialsTip');
    const tipText = document.getElementById('tipText');
    const loginError = document.getElementById('loginErrorMessage');
    const googleBtn = document.getElementById('googleSignInButton');
    const googleDiv = document.getElementById('googleDivider');

    loginError.style.display = 'none';

    if (role === 'student') {
        btnStudent.classList.add('active');
        btnAdmin.classList.remove('active');
        registerPrompt.classList.remove('hidden');
        credentialsTip.classList.remove('hidden');
        tipText.innerHTML = `Student: <code>student</code> / Password: <code>student123</code>`;
        if (googleBtn) googleBtn.classList.remove('hidden');
        if (googleDiv) googleDiv.classList.remove('hidden');
    } else {
        btnStudent.classList.remove('active');
        btnAdmin.classList.add('active');
        registerPrompt.classList.add('hidden');
        credentialsTip.classList.remove('hidden');
        tipText.innerHTML = `Admin: <code>admin</code> / Password: <code>admin123</code>`;
        if (googleBtn) googleBtn.classList.add('hidden');
        if (googleDiv) googleDiv.classList.add('hidden');
    }
}

// Toggle Registration vs Login panels
const toggleRegisterLink = document.getElementById('toggleRegisterLink');
const toggleLoginLink = document.getElementById('toggleLoginLink');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');

if (toggleRegisterLink) {
    toggleRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        document.getElementById('loginErrorMessage').style.display = 'none';
        document.getElementById('regErrorMessage').style.display = 'none';
        document.getElementById('regSuccessMessage').style.display = 'none';
    });
}

if (toggleLoginLink) {
    toggleLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });
}

// Login & Register form submission logic
function setupAuthListeners() {
    // 1. Login Handler
    const formLogin = document.getElementById('loginForm');
    if (formLogin) {
        formLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            const usernameInput = document.getElementById('loginUsername').value.trim();
            const passwordInput = document.getElementById('loginPassword').value.trim();
            const loginError = document.getElementById('loginErrorMessage');

            fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => { throw new Error(data.error || 'Login failed') });
                }
                return res.json();
            })
            .then(matchedUser => {
                if (matchedUser.role !== currentRole) {
                    loginError.style.display = 'block';
                    loginError.textContent = `Access denied. Selected role does not match account privileges.`;
                    return;
                }

                // Successful login
                loginError.style.display = 'none';
                loggedInUser = matchedUser;
                document.getElementById('loginWrapper').classList.add('hidden');
                
                // Reset form values
                formLogin.reset();

                // Open proper dashboard
                if (matchedUser.role === 'admin') {
                    openAdminDashboard();
                } else {
                    openStudentDashboard(matchedUser);
                }
            })
            .catch(err => {
                loginError.style.display = 'block';
                loginError.textContent = err.message || `Invalid Username or Password. Please try again.`;
            });
        });
    }

    // 2. Student Self Registration Handler
    const formRegister = document.getElementById('registerForm');
    if (formRegister) {
        formRegister.addEventListener('submit', (e) => {
            e.preventDefault();
            const fullName = document.getElementById('regFullName').value.trim();
            const selectedClass = document.getElementById('regClass').value;
            const usernameInput = document.getElementById('regUsername').value.trim();
            const passwordInput = document.getElementById('regPassword').value.trim();
            const regError = document.getElementById('regErrorMessage');
            const regSuccess = document.getElementById('regSuccessMessage');

            regError.style.display = 'none';
            regSuccess.style.display = 'none';

            fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: usernameInput, password: passwordInput, fullName, class: selectedClass })
            })
            .then(res => {
                if (!res.ok) {
                    return res.json().then(data => { throw new Error(data.error || 'Registration failed') });
                }
                return res.json();
            })
            .then(data => {
                regSuccess.style.display = 'block';
                regSuccess.textContent = `Account created successfully! Switching to Login...`;

                setTimeout(() => {
                    formRegister.reset();
                    registerForm.classList.add('hidden');
                    loginForm.classList.remove('hidden');
                    // Auto fill the login form with new student credentials
                    document.getElementById('loginUsername').value = usernameInput;
                    document.getElementById('loginPassword').value = passwordInput;
                    switchLoginRole('student');
                }, 1500);
            })
            .catch(err => {
                regError.style.display = 'block';
                regError.textContent = err.message;
            });
        });
    }
}

// Log out handler
function logout() {
    loggedInUser = null;
    document.getElementById('adminPortal').classList.add('hidden');
    document.getElementById('studentPortal').classList.add('hidden');
    document.getElementById('loginWrapper').classList.remove('hidden');
}

// ==========================================
// 2. TABS & SWITCHING OPERATIONS
// ==========================================
function switchDashboardTab(role, tabId) {
    const activeDashboard = document.getElementById(`${role}Portal`);
    
    // Deactivate all sidebar active tabs
    const menuItems = activeDashboard.querySelectorAll('.sidebar-menu .menu-item');
    menuItems.forEach(item => {
        if (item.getAttribute('data-target') === tabId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Toggle panels
    const panels = activeDashboard.querySelectorAll('main .tab-panel');
    panels.forEach(panel => {
        if (panel.getAttribute('id') === tabId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });

    // Specific loads
    if (role === 'admin') {
        if (tabId === 'admin-overview') renderAdminOverview();
        else if (tabId === 'admin-inquiries') renderAdminInquiries();
        else if (tabId === 'admin-tests') renderAdminTests();
        else if (tabId === 'admin-announcements') renderAdminAnnouncements();
        else if (tabId === 'admin-study') renderAdminStudy();
        else if (tabId === 'admin-doubts') renderAdminDoubts();
    } else {
        if (tabId === 'student-courses') renderStudentTests();
        else if (tabId === 'student-study') renderStudentStudy();
        else if (tabId === 'student-announcements') renderStudentAnnouncements();
        else if (tabId === 'student-doubts') renderStudentDoubts();
    }
}

// ==========================================
// 3. ADMIN PORTAL MODULES RENDER
// ==========================================
function openAdminDashboard() {
    document.getElementById('adminPortal').classList.remove('hidden');
    switchDashboardTab('admin', 'admin-overview');
    
    // Setup Forms listeners for admin
    setupAdminForms();
}

function renderAdminOverview() {
    Promise.all([
        fetch('/api/inquiries').then(res => res.json()),
        fetch('/api/tests').then(res => res.json()),
        fetch('/api/doubts').then(res => res.json())
    ])
    .then(([inquiries, tests, doubts]) => {
        const totalInqs = inquiries.length;
        const pendingInqs = inquiries.filter(i => i.status === 'Pending').length;
        const mockTests = tests.length;
        const unresolvedDoubts = doubts.filter(d => d.status === 'Pending').length;

        document.getElementById('statTotalInqs').textContent = totalInqs;
        document.getElementById('statPendingInqs').textContent = pendingInqs;
        document.getElementById('statMockTests').textContent = mockTests;
        document.getElementById('statUnresolvedDoubts').textContent = unresolvedDoubts;

        // Badges update
        document.getElementById('inqCountBadge').textContent = pendingInqs;
        document.getElementById('doubtsCountBadge').textContent = unresolvedDoubts;

        // 2. Render recent 5 inquiries in Overview table
        const tableBody = document.getElementById('overviewInquiriesTable');
        tableBody.innerHTML = '';

        const recentInquiries = [...inquiries].reverse().slice(0, 5);

        if (recentInquiries.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--color-text-gray);">No inquiries captured yet.</td></tr>`;
            return;
        }

        recentInquiries.forEach(inq => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><strong>${escapeHtml(inq.studentName)}</strong></td>
                <td>${escapeHtml(inq.studentClass)}</td>
                <td>${escapeHtml(inq.phoneNumber)}</td>
                <td>${escapeHtml(inq.date)}</td>
                <td><span class="status-badge ${getStatusClass(inq.status)}">${escapeHtml(inq.status)}</span></td>
            `;
            tableBody.appendChild(row);
        });
    })
    .catch(err => console.error('Error rendering admin overview:', err));
}

function renderAdminInquiries() {
    fetch('/api/inquiries')
        .then(res => res.json())
        .then(data => {
            const inquiries = data.map(x => ({ ...x, id: x._id }));
            loadedInquiries = inquiries;
            const inqList = document.getElementById('adminInquiriesList');
            inqList.innerHTML = '';

            const pendingCount = inquiries.filter(i => i.status === 'Pending').length;
            document.getElementById('inqCountBadge').textContent = pendingCount;

            if (inquiries.length === 0) {
                inqList.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-text-gray); padding: 30px;">No admission inquiries registered.</td></tr>`;
                return;
            }

            const sortedInquiries = [...inquiries].reverse();

            sortedInquiries.forEach(inq => {
                const row = document.createElement('tr');
                row.setAttribute('data-id', inq.id);
                row.innerHTML = `
                    <td><strong>${escapeHtml(inq.studentName)}</strong></td>
                    <td>${escapeHtml(inq.parentName || 'N/A')}</td>
                    <td>${escapeHtml(inq.studentClass)}</td>
                    <td>${escapeHtml(inq.targetExam || 'IIT Foundation')}</td>
                    <td><a href="tel:${escapeHtml(inq.phoneNumber)}" style="color: inherit; text-decoration: underline;">${escapeHtml(inq.phoneNumber)}</a></td>
                    <td>${escapeHtml(inq.date)}</td>
                    <td>
                        <select class="status-select" onchange="updateInquiryStatus('${inq.id}', this.value)">
                            <option value="Pending" ${inq.status === 'Pending' ? 'selected' : ''}>Pending</option>
                            <option value="Contacted" ${inq.status === 'Contacted' ? 'selected' : ''}>Contacted</option>
                            <option value="Enrolled" ${inq.status === 'Enrolled' ? 'selected' : ''}>Enrolled</option>
                        </select>
                    </td>
                    <td><div style="max-width: 220px; max-height: 80px; overflow-y: auto; font-size: 0.8rem;">${escapeHtml(inq.message || 'No remarks')}</div></td>
                    <td>
                        <button class="btn-delete" onclick="deleteInquiry('${inq.id}')" title="Remove Lead">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                `;
                inqList.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering admin inquiries:', err));
}

function filterInquiriesTable() {
    const searchVal = document.getElementById('inqSearchInput').value.toLowerCase();
    const filterVal = document.getElementById('inqFilterSelect').value;
    
    const rows = document.querySelectorAll('#adminInquiriesList tr');

    rows.forEach(row => {
        const id = row.getAttribute('data-id');
        const inq = loadedInquiries.find(i => i.id === id);

        if (!inq) return;

        const matchesSearch = inq.studentName.toLowerCase().includes(searchVal) || 
                              inq.studentClass.toLowerCase().includes(searchVal) ||
                              (inq.parentName && inq.parentName.toLowerCase().includes(searchVal));
        
        const matchesStatus = filterVal === 'All' || inq.status === filterVal;

        if (matchesSearch && matchesStatus) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

function updateInquiryStatus(id, newStatus) {
    fetch(`/api/inquiries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
    })
    .then(res => {
        if (!res.ok) throw new Error('Failed to update inquiry status');
        return res.json();
    })
    .then(() => {
        fetch('/api/inquiries')
            .then(res => res.json())
            .then(data => {
                const pendingCount = data.filter(i => i.status === 'Pending').length;
                document.getElementById('inqCountBadge').textContent = pendingCount;
            });
    })
    .catch(err => console.error(err));
}

function deleteInquiry(id) {
    if (confirm('Are you sure you want to delete this admission inquiry?')) {
        fetch(`/api/inquiries/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to delete inquiry');
                renderAdminInquiries();
            })
            .catch(err => console.error(err));
    }
}

function renderAdminTests() {
    fetch('/api/tests')
        .then(res => res.json())
        .then(data => {
            const tests = data.map(x => ({ ...x, id: x._id }));
            const testsList = document.getElementById('adminTestsList');
            testsList.innerHTML = '';

            if (tests.length === 0) {
                testsList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-gray); padding: 20px;">No mock tests scheduled.</td></tr>`;
                return;
            }

            tests.forEach(test => {
                const row = document.createElement('tr');
                const formattedDate = new Date(test.dateTime).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
                row.innerHTML = `
                    <td><strong>${escapeHtml(test.subject)}</strong></td>
                    <td>${escapeHtml(formattedDate)}</td>
                    <td><div style="font-size: 0.8rem; line-height: 1.4;">${escapeHtml(test.syllabus)}</div></td>
                    <td>
                        <button class="btn-delete" onclick="deleteMockTest('${test.id}')" title="Delete Test">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                `;
                testsList.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering admin tests:', err));
}

function deleteMockTest(id) {
    if (confirm('Remove this mock test from student schedules?')) {
        fetch(`/api/tests/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to delete mock test');
                renderAdminTests();
            })
            .catch(err => console.error(err));
    }
}

function renderAdminAnnouncements() {
    fetch('/api/announcements')
        .then(res => res.json())
        .then(data => {
            const announcements = data.map(x => ({ ...x, id: x._id }));
            const listContainer = document.getElementById('adminAnnouncementsList');
            listContainer.innerHTML = '';

            if (announcements.length === 0) {
                listContainer.innerHTML = `<p style="text-align: center; color: var(--color-text-gray); padding: 20px;">No announcements published.</p>`;
                return;
            }

            const sorted = [...announcements].reverse();

            sorted.forEach(ann => {
                const item = document.createElement('div');
                item.className = 'announcement-item';
                item.innerHTML = `
                    <div class="ann-item-header">
                        <h5>${escapeHtml(ann.title)}</h5>
                        <div class="ann-meta">
                            <span class="ann-urgency-tag ${getUrgencyTagClass(ann.tag)}">${escapeHtml(ann.tag)}</span>
                            <span class="ann-date">${escapeHtml(ann.date)}</span>
                        </div>
                    </div>
                    <div class="ann-item-body">
                        <p>${escapeHtml(ann.content)}</p>
                    </div>
                    <button class="btn-delete-ann" onclick="deleteAnnouncement('${ann.id}')" title="Remove Announcement">
                        <i class="fa-solid fa-trash"></i> Delete
                    </button>
                `;
                listContainer.appendChild(item);
            });
        })
        .catch(err => console.error('Error rendering admin announcements:', err));
}

function deleteAnnouncement(id) {
    if (confirm('Delete this notice from student announcement boards?')) {
        fetch(`/api/announcements/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to delete announcement');
                renderAdminAnnouncements();
            })
            .catch(err => console.error(err));
    }
}

function renderAdminStudy() {
    fetch('/api/study')
        .then(res => res.json())
        .then(data => {
            const study = data.map(x => ({ ...x, id: x._id }));
            const studyList = document.getElementById('adminStudyList');
            studyList.innerHTML = '';

            if (study.length === 0) {
                studyList.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-gray); padding: 20px;">No study materials added.</td></tr>`;
                return;
            }

            study.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${escapeHtml(item.title)}</strong></td>
                    <td><span style="font-size: 0.8rem; font-weight: 500;">${escapeHtml(item.subject)}</span></td>
                    <td><a href="${escapeHtml(item.url)}" target="_blank" class="study-download-link"><i class="fa-solid fa-up-right-from-square"></i> Open Link</a></td>
                    <td>
                        <button class="btn-delete" onclick="deleteStudyMaterial('${item.id}')" title="Delete Material">
                            <i class="fa-regular fa-trash-can"></i>
                        </button>
                    </td>
                `;
                studyList.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering admin study materials:', err));
}

function deleteStudyMaterial(id) {
    if (confirm('Remove this study resource from library?')) {
        fetch(`/api/study/${id}`, { method: 'DELETE' })
            .then(res => {
                if (!res.ok) throw new Error('Failed to delete study material');
                renderAdminStudy();
            })
            .catch(err => console.error(err));
    }
}

function renderAdminDoubts() {
    fetch('/api/doubts')
        .then(res => res.json())
        .then(data => {
            const doubts = data.map(x => ({ ...x, id: x._id }));
            loadedDoubts = doubts;
            const doubtsList = document.getElementById('adminDoubtsList');
            doubtsList.innerHTML = '';

            const pendingCount = doubts.filter(d => d.status === 'Pending').length;
            document.getElementById('doubtsCountBadge').textContent = pendingCount;

            if (doubts.length === 0) {
                doubtsList.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-gray); padding: 25px;">No academic doubts submitted by students.</td></tr>`;
                return;
            }

            const sorted = [...doubts].sort((a, b) => (a.status === 'Pending' ? -1 : 1));

            sorted.forEach(doubt => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${escapeHtml(doubt.studentName)}</strong><br><span style="font-size:0.75rem; color:var(--color-text-gray)">@${escapeHtml(doubt.studentUsername)}</span></td>
                    <td><span style="font-size:0.8rem; font-weight: 500;">${escapeHtml(doubt.subject)}</span></td>
                    <td><div style="max-width: 250px; max-height: 80px; overflow-y: auto; font-size: 0.8rem; line-height: 1.4;">${escapeHtml(doubt.question)}</div></td>
                    <td><span class="status-badge ${doubt.status === 'Pending' ? 'status-pending' : 'status-enrolled'}">${escapeHtml(doubt.status)}</span></td>
                    <td><div style="max-width: 220px; max-height: 80px; overflow-y: auto; font-size: 0.8rem; line-height: 1.4; color: var(--color-text-gray); font-style: italic;">${doubt.reply ? escapeHtml(doubt.reply) : 'No reply yet'}</div></td>
                    <td>
                        ${doubt.status === 'Pending' ? 
                            `<button class="btn-resolve" onclick="openDoubtModal('${doubt.id}')"><i class="fa-solid fa-comment-dots"></i> Answer</button>` : 
                            `<button class="btn-resolve" style="opacity:0.6" onclick="openDoubtModal('${doubt.id}')"><i class="fa-solid fa-pen-to-square"></i> Edit Answer</button>`
                        }
                    </td>
                `;
                doubtsList.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering admin doubts:', err));
}

function openDoubtModal(id) {
    const doubt = loadedDoubts.find(d => d.id === id);
    if (doubt) {
        document.getElementById('replyDoubtId').value = doubt.id;
        document.getElementById('replyDoubtQuestionText').textContent = `"${doubt.question}"`;
        document.getElementById('teacherReplyText').value = doubt.reply || '';
        document.getElementById('replyDoubtModal').classList.remove('hidden');
    }
}

function closeDoubtModal() {
    document.getElementById('replyDoubtModal').classList.add('hidden');
    document.getElementById('replyDoubtForm').reset();
}

function setupAdminForms() {
    const testForm = document.getElementById('scheduleTestForm');
    if (testForm) {
        testForm.onsubmit = (e) => {
            e.preventDefault();
            const subject = document.getElementById('testSubject').value;
            const syllabus = document.getElementById('testSyllabus').value.trim();
            const date = document.getElementById('testDate').value;
            const time = document.getElementById('testTime').value;

            fetch('/api/tests', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, dateTime: `${date}T${time}`, syllabus })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to schedule test');
                testForm.reset();
                renderAdminTests();
            })
            .catch(err => console.error(err));
        };
    }

    const annForm = document.getElementById('postAnnouncementForm');
    if (annForm) {
        annForm.onsubmit = (e) => {
            e.preventDefault();
            const title = document.getElementById('annTitle').value.trim();
            const content = document.getElementById('annContent').value.trim();
            const tag = document.getElementById('annTag').value;

            fetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, tag })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to post announcement');
                annForm.reset();
                renderAdminAnnouncements();
            })
            .catch(err => console.error(err));
        };
    }

    const studyForm = document.getElementById('addStudyForm');
    if (studyForm) {
        studyForm.onsubmit = (e) => {
            e.preventDefault();
            const title = document.getElementById('studyTitle').value.trim();
            const subject = document.getElementById('studySubject').value;
            const url = document.getElementById('studyUrl').value.trim();

            fetch('/api/study', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, subject, url })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to add study material');
                studyForm.reset();
                renderAdminStudy();
            })
            .catch(err => console.error(err));
        };
    }

    const replyForm = document.getElementById('replyDoubtForm');
    if (replyForm) {
        replyForm.onsubmit = (e) => {
            e.preventDefault();
            const id = document.getElementById('replyDoubtId').value;
            const replyText = document.getElementById('teacherReplyText').value.trim();

            fetch(`/api/doubts/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reply: replyText })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to answer doubt');
                closeDoubtModal();
                renderAdminDoubts();
            })
            .catch(err => console.error(err));
        };
    }
}

// ==========================================
// 4. STUDENT PORTAL MODULES RENDER
// ==========================================
function openStudentDashboard(user) {
    document.getElementById('studentPortal').classList.remove('hidden');
    
    // Display Profile Details
    document.getElementById('studentProfileName').textContent = user.fullName;
    document.getElementById('studentProfileClass').textContent = user.class;
    document.getElementById('studentWelcomeName').textContent = user.fullName;
    document.getElementById('studentHeroClass').textContent = `${user.class} Core Prep`;

    switchDashboardTab('student', 'student-courses');
    
    // Setup Forms listeners for student
    setupStudentForms();
}

function renderStudentTests() {
    fetch('/api/tests')
        .then(res => res.json())
        .then(data => {
            const tests = data.map(x => ({ ...x, id: x._id }));
            const testsList = document.getElementById('studentTestsList');
            testsList.innerHTML = '';

            if (tests.length === 0) {
                testsList.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-text-gray); padding: 20px;">No mock tests scheduled. Check back later!</td></tr>`;
                return;
            }

            tests.forEach(test => {
                const row = document.createElement('tr');
                const formattedDate = new Date(test.dateTime).toLocaleString('en-IN', {
                    dateStyle: 'medium',
                    timeStyle: 'short'
                });
                row.innerHTML = `
                    <td><strong>${escapeHtml(test.subject)}</strong></td>
                    <td>${escapeHtml(formattedDate)}</td>
                    <td><div style="font-size: 0.85rem; line-height: 1.4;">${escapeHtml(test.syllabus)}</div></td>
                `;
                testsList.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering student tests:', err));
}

function renderStudentStudy() {
    fetch('/api/study')
        .then(res => res.json())
        .then(data => {
            const study = data.map(x => ({ ...x, id: x._id }));
            const studyList = document.getElementById('studentStudyList');
            studyList.innerHTML = '';

            if (study.length === 0) {
                studyList.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--color-text-gray); padding: 20px;">No study resources shared yet.</td></tr>`;
                return;
            }

            study.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${escapeHtml(item.title)}</strong></td>
                    <td><span style="font-size:0.8rem; font-weight: 500;">${escapeHtml(item.subject)}</span></td>
                    <td><a href="${escapeHtml(item.url)}" target="_blank" class="study-download-link"><i class="fa-solid fa-cloud-arrow-down"></i> View / Download</a></td>
                `;
                studyList.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering student study materials:', err));
}

function renderStudentAnnouncements() {
    fetch('/api/announcements')
        .then(res => res.json())
        .then(data => {
            const announcements = data.map(x => ({ ...x, id: x._id }));
            const listContainer = document.getElementById('studentAnnouncementsList');
            listContainer.innerHTML = '';

            if (announcements.length === 0) {
                listContainer.innerHTML = `<p style="text-align: center; color: var(--color-text-gray); padding: 20px;">No announcements published on notice board.</p>`;
                return;
            }

            const sorted = [...announcements].reverse();

            sorted.forEach(ann => {
                const item = document.createElement('div');
                item.className = 'announcement-item';
                item.innerHTML = `
                    <div class="ann-item-header">
                        <h5>${escapeHtml(ann.title)}</h5>
                        <div class="ann-meta">
                            <span class="ann-urgency-tag ${getUrgencyTagClass(ann.tag)}">${escapeHtml(ann.tag)}</span>
                            <span class="ann-date">${escapeHtml(ann.date)}</span>
                        </div>
                    </div>
                    <div class="ann-item-body">
                        <p>${escapeHtml(ann.content)}</p>
                    </div>
                `;
                listContainer.appendChild(item);
            });
        })
        .catch(err => console.error('Error rendering student announcements:', err));
}

function renderStudentDoubts() {
    fetch(`/api/doubts?studentUsername=${encodeURIComponent(loggedInUser.username)}`)
        .then(res => res.json())
        .then(data => {
            const doubts = data.map(x => ({ ...x, id: x._id }));
            const listContainer = document.getElementById('studentDoubtsList');
            listContainer.innerHTML = '';

            if (doubts.length === 0) {
                listContainer.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--color-text-gray); padding: 20px;">No doubt tickets logged. Use the form to submit one.</td></tr>`;
                return;
            }

            const sorted = [...doubts].reverse();

            sorted.forEach(doubt => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${escapeHtml(doubt.subject)}</strong></td>
                    <td><div style="font-size:0.8rem; line-height: 1.4; max-width:200px;">${escapeHtml(doubt.question)}</div></td>
                    <td><span class="status-badge ${doubt.status === 'Pending' ? 'status-pending' : 'status-enrolled'}">${escapeHtml(doubt.status)}</span></td>
                    <td><div style="font-size:0.8rem; line-height: 1.4; max-width:200px; color: var(--color-text-gray); font-style: italic;">${doubt.reply ? escapeHtml(doubt.reply) : 'Teacher will reply shortly'}</div></td>
                `;
                listContainer.appendChild(row);
            });
        })
        .catch(err => console.error('Error rendering student doubts:', err));
}

function setupStudentForms() {
    const doubtForm = document.getElementById('askDoubtForm');
    if (doubtForm) {
        doubtForm.onsubmit = (e) => {
            e.preventDefault();
            const subject = document.getElementById('doubtSubject').value;
            const question = document.getElementById('doubtQuestion').value.trim();

            fetch('/api/doubts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    studentUsername: loggedInUser.username,
                    studentName: loggedInUser.fullName,
                    subject,
                    question
                })
            })
            .then(res => {
                if (!res.ok) throw new Error('Failed to submit doubt');
                doubtForm.reset();
                renderStudentDoubts();
            })
            .catch(err => console.error(err));
        };
    }
}

// ==========================================
// 5. HELPER UTILITIES
// ==========================================
function getStatusClass(status) {
    if (status === 'Pending') return 'status-pending';
    if (status === 'Contacted') return 'status-contacted';
    return 'status-enrolled';
}

function getUrgencyTagClass(tag) {
    if (tag === 'Important') return 'tag-important';
    if (tag === 'Urgent') return 'tag-urgent';
    return 'tag-general';
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 6. GOOGLE SIGN-IN INTEGRATION
// ==========================================
let googleInitialized = false;

window.initGoogleSignIn = function() {
    if (googleInitialized) return;
    if (typeof google === 'undefined') return;
    
    googleInitialized = true;
    
    fetch('/api/config')
        .then(res => res.json())
        .then(config => {
            const clientId = config.googleClientId || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
            
            google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleSignIn
            });
            
            const btnContainer = document.getElementById('googleSignInButton');
            if (btnContainer) {
                google.accounts.id.renderButton(
                    btnContainer,
                    { theme: 'outline', size: 'large', width: 380, logo_alignment: 'left' }
                );
            }
        })
        .catch(err => {
            console.error('Failed to load Google OAuth configuration:', err);
            googleInitialized = false; // allow retry
        });
};

function handleGoogleSignIn(response) {
    const loginError = document.getElementById('loginErrorMessage');
    if (loginError) loginError.style.display = 'none';

    fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
    })
    .then(res => {
        if (!res.ok) {
            return res.json().then(data => { throw new Error(data.error || 'Google login failed') });
        }
        return res.json();
    })
    .then(matchedUser => {
        if (matchedUser.role !== 'student') {
            if (loginError) {
                loginError.style.display = 'block';
                loginError.textContent = `Access denied. Google login is only for students.`;
            }
            return;
        }

        // Successful login
        loggedInUser = matchedUser;
        document.getElementById('loginWrapper').classList.add('hidden');
        
        // Reset login form
        const formLogin = document.getElementById('loginForm');
        if (formLogin) formLogin.reset();

        // Open student dashboard
        openStudentDashboard(matchedUser);
    })
    .catch(err => {
        if (loginError) {
            loginError.style.display = 'block';
            loginError.textContent = err.message || `Google Sign-in failed. Please try username/password.`;
        }
    });
}

