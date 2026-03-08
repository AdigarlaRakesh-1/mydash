import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, doc, setDoc, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAWTPDAm_dnjq3AtgCgaktnTUP1LmXxFu0",
  authDomain: "mydash-sync.firebaseapp.com",
  projectId: "mydash-sync",
  storageBucket: "mydash-sync.firebasestorage.app",
  messagingSenderId: "51931691249",
  appId: "1:51931691249:web:4e44477e5d77f870e21150",
  measurementId: "G-HCW6868EN4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ===== DATA STORE =====
const Store = {
    _userId: null,
    _tasks: [],
    _expenses: [],
    _unsubscribeTasks: null,
    _unsubscribeExpenses: null,

    initAuth(callback) {
        onAuthStateChanged(auth, (user) => {
            if (user) {
                this._userId = user.uid;
                
                // Update UI Profile
                const profile = document.getElementById('sidebarProfile');
                const avatar = document.getElementById('userAvatar');
                const name = document.getElementById('userName');
                const email = document.getElementById('userEmail');
                if (profile) profile.style.display = 'flex';
                if (avatar) avatar.src = user.photoURL || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(user.displayName || user.email);
                if (name) name.textContent = user.displayName || 'Anonymous';
                if (email) email.textContent = user.email;

                // Hide login, show app layout
                document.getElementById('loginScreen').classList.remove('show');
                document.querySelector('.app-layout').style.display = 'flex';

                this._setupListeners(callback);
            } else {
                this._userId = null;
                this._tasks = [];
                this._expenses = [];
                if (this._unsubscribeTasks) this._unsubscribeTasks();
                if (this._unsubscribeExpenses) this._unsubscribeExpenses();
                
                // Show login, hide app layout
                document.getElementById('loginScreen').classList.add('show');
                document.querySelector('.app-layout').style.display = 'none';
                
                const profile = document.getElementById('sidebarProfile');
                if (profile) profile.style.display = 'none';
                if (callback) callback(); // Initial empty render
            }
        });

        // Attach login/logout handlers
        const btnLogin = document.getElementById('btnGoogleLogin');
        if (btnLogin) {
            btnLogin.addEventListener('click', () => {
                const provider = new GoogleAuthProvider();
                signInWithPopup(auth, provider).catch(err => {
                    console.error("Login failed", err);
                    alert("Login failed: " + err.message);
                });
            });
        }

        const btnLogout = document.getElementById('btnLogout');
        if (btnLogout) {
            btnLogout.addEventListener('click', () => {
                signOut(auth).catch(err => console.error("Logout failed", err));
            });
        }
    },

    _setupListeners(onDataChanged) {
        if (this._unsubscribeTasks) this._unsubscribeTasks();
        if (this._unsubscribeExpenses) this._unsubscribeExpenses();

        const tasksRef = collection(db, `users/${this._userId}/tasks`);
        this._unsubscribeTasks = onSnapshot(tasksRef, (snapshot) => {
            this._tasks = snapshot.docs.map(doc => doc.data());
            if (onDataChanged) onDataChanged();
        });

        const expsRef = collection(db, `users/${this._userId}/expenses`);
        this._unsubscribeExpenses = onSnapshot(expsRef, (snapshot) => {
            this._expenses = snapshot.docs.map(doc => doc.data());
            if (onDataChanged) onDataChanged();
        });
    },

    getTasks()    { return this._tasks; },
    getExpenses() { return this._expenses; },

    async saveTask(task) {
        if (!this._userId) { console.error("Missing UserID during saveTask"); return; }
        if (!task.id) task.id = generateId(); // Ensure ID exists
        try {
            const ref = doc(db, `users/${this._userId}/tasks`, task.id);
            await setDoc(ref, task);
            console.log("Task saved to Firebase:", task.id);
        } catch (err) {
            console.error("FIREBASE ERROR (saveTask):", err.message, err.code);
            alert("Firebase Error: " + err.message);
        }
    },

    async deleteTask(id) {
        if (!this._userId) return;
        try {
            const ref = doc(db, `users/${this._userId}/tasks`, id);
            await deleteDoc(ref);
        } catch(err) { console.error("Error deleting task:", err); }
    },

    async saveExpense(exp) {
        if (!this._userId) { console.error("Missing UserID during saveExpense"); return; }
        if (!exp.id) exp.id = generateId();
        try {
            const ref = doc(db, `users/${this._userId}/expenses`, exp.id);
            await setDoc(ref, exp);
            console.log("Expense saved to Firebase:", exp.id);
        } catch (err) {
            console.error("FIREBASE ERROR (saveExpense):", err.message, err.code);
            alert("Firebase Error: " + err.message);
        }
    },

    async deleteExpense(id) {
        if (!this._userId) return;
        try {
            const ref = doc(db, `users/${this._userId}/expenses`, id);
            await deleteDoc(ref);
        } catch(err) { console.error("Error deleting expense:", err); }
    }
};


// ===== UTILITIES =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function formatDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return 'No date';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    if (isNaN(year) || isNaN(month) || isNaN(day)) return dateStr;
    return `${MONTHS[month]} ${day}, ${year}`;
}

function toDateStr(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function todayStr() {
    return toDateStr(new Date());
}

const CATEGORY_ICONS = {
    work: '💼', personal: '🏠', health: '💪', finance: '💰', study: '📚'
};

const EXPENSE_ICONS = {
    salary: '💰', food: '🍔', transport: '🚗', shopping: '🛍️', bills: '📄',
    entertainment: '🎬', health: '💊', education: '📚', other: '📦'
};

const CAT_COLORS = {
    work: 'var(--accent)', personal: 'var(--green)',
    health: 'var(--orange)', finance: 'var(--purple)', study: 'var(--blue)'
};


// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const dom = {
    sidebarDate:     $('#sidebarDate'),
    topBarDate:      $('#topBarDate'),
    pageTitle:       $('#pageTitle'),
    navItems:        $$('.nav-item[data-tab]'),
    tabContents:     $$('.tab-content'),
    sidebar:         $('#sidebar'),
    mobileMenuBtn:   $('#mobileMenuBtn'),
    navQuickAdd:     $('#navQuickAdd'),

    // Calendar
    calMonthTitle:   $('#calMonthTitle'),
    calCells:        $('#calendarCells'),
    prevMonth:       $('#prevMonth'),
    nextMonth:       $('#nextMonth'),
    btnToday:        $('#btnToday'),
    dayDetailPanel:  $('#dayDetailPanel'),
    dayDetailTitle:  $('#dayDetailTitle'),
    dayDetailContent:$('#dayDetailContent'),
    addFromCalendar: $('#addFromCalendar'),

    // Tasks
    addTaskBtn:      $('#addTaskBtn'),
    taskList:        $('#taskList'),
    filterChips:     $$('.filter-chip'),

    // Expenses
    addExpenseBtn:   $('#addExpenseBtn'),
    monthTotal:      $('#monthTotal'),
    incomeTotal:     $('#incomeTotal'),
    spentTotal:      $('#spentTotal'),
    topCategory:     $('#topCategory'),
    barChart:        $('#barChart'),
    expenseList:     $('#expenseList'),

    // Task Modal
    taskModal:       $('#taskModal'),
    closeTaskModal:  $('#closeTaskModal'),
    taskForm:        $('#taskForm'),
    taskModalTitle:  $('#taskModalTitle'),
    taskEditId:      $('#taskEditId'),
    taskTitle:       $('#taskTitle'),
    taskType:        $('#taskType'),
    taskCategory:    $('#taskCategory'),
    taskDate:        $('#taskDate'),
    taskTime:        $('#taskTime'),
    taskPriority:    $('#taskPriority'),
    taskNotes:       $('#taskNotes'),

    // Expense Modal
    expenseModal:    $('#expenseModal'),
    closeExpenseModal:$('#closeExpenseModal'),
    expenseForm:     $('#expenseForm'),
    expenseType:     $('#expenseType'),
    expenseDesc:     $('#expenseDesc'),
    expenseAmount:   $('#expenseAmount'),
    expenseCategory: $('#expenseCategory'),
    expenseDate:     $('#expenseDate'),
};


// ===== STATE =====
let calYear, calMonth, selectedDate;
let currentFilter = 'all';

function initState() {
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth();
    selectedDate = todayStr();
}


// ===== HEADER =====
const TAB_TITLES = { calendar: 'Calendar', tasks: 'Tasks & Events', expenses: 'Expenses' };

function renderHeader() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('en-IN', options);
    if (dom.sidebarDate) dom.sidebarDate.textContent = dateStr;
    if (dom.topBarDate) dom.topBarDate.textContent = dateStr;
}


// ===== SIDEBAR NAVIGATION =====
function initTabs() {
    // Nav items (exclude Quick Add which has a different role)
    dom.navItems.forEach(btn => {
        if (btn.id === 'navQuickAdd') return;
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            dom.navItems.forEach(b => { if (b.id !== 'navQuickAdd') b.classList.remove('active'); });
            btn.classList.add('active');
            dom.tabContents.forEach(tc => tc.classList.remove('active'));
            $(`#tab-${tab}`).classList.add('active');
            if (dom.pageTitle) dom.pageTitle.textContent = TAB_TITLES[tab] || 'Dashboard';

            // Refresh views
            if (tab === 'calendar') renderCalendar();
            else if (tab === 'tasks') renderTaskList();
            else if (tab === 'expenses') renderExpenses();

            // Close mobile sidebar
            if (dom.sidebar) dom.sidebar.classList.remove('open');
        });
    });

    // Quick Add opens task modal
    if (dom.navQuickAdd) {
        dom.navQuickAdd.addEventListener('click', () => openNewTask());
    }

    // Mobile menu toggle
    if (dom.mobileMenuBtn && dom.sidebar) {
        dom.mobileMenuBtn.addEventListener('click', () => {
            dom.sidebar.classList.toggle('open');
        });
    }
}


// ===== CALENDAR =====
function renderCalendar() {
    dom.calMonthTitle.textContent = `${MONTHS[calMonth]} ${calYear}`;

    const firstDay = new Date(calYear, calMonth, 1).getDay();
    const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calYear, calMonth, 0).getDate();

    const tasks = Store.getTasks();
    const today = todayStr();

    let html = '';

    // Previous month filler
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = daysInPrevMonth - i;
        html += `<div class="cal-cell other-month">${day}</div>`;
    }

    // Current month
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const isToday = dateStr === today;
        const isSelected = dateStr === selectedDate;
        const dayTasks = tasks.filter(t => t.date === dateStr);

        let dotsHtml = '';
        if (dayTasks.length > 0) {
            const uniqueCats = [...new Set(dayTasks.map(t => t.category))].slice(0, 3);
            dotsHtml = `<div class="event-dots">${uniqueCats.map(c => `<div class="event-dot ${c}"></div>`).join('')}</div>`;
        }

        const classes = ['cal-cell'];
        if (isToday) classes.push('today');
        if (isSelected && !isToday) classes.push('selected');

        html += `<div class="${classes.join(' ')}" data-date="${dateStr}">${d}${dotsHtml}</div>`;
    }

    // Next month filler
    const totalCells = firstDay + daysInMonth;
    const remainder = totalCells % 7;
    if (remainder > 0) {
        for (let i = 1; i <= 7 - remainder; i++) {
            html += `<div class="cal-cell other-month">${i}</div>`;
        }
    }

    dom.calCells.innerHTML = html;

    // Click handlers
    dom.calCells.querySelectorAll('.cal-cell:not(.other-month)').forEach(cell => {
        cell.addEventListener('click', () => {
            selectedDate = cell.dataset.date;
            renderCalendar();
            renderDayDetail();
        });
    });

    renderDayDetail();
}

function renderDayDetail() {
    const d = new Date(selectedDate + 'T00:00:00');
    dom.dayDetailTitle.textContent = formatDate(selectedDate);

    const tasks = Store.getTasks().filter(t => t.date === selectedDate);
    if (tasks.length === 0) {
        dom.dayDetailContent.innerHTML = '<p class="empty-state">No events or tasks for this day.</p>';
    } else {
        dom.dayDetailContent.innerHTML = tasks.map(t => `
            <div class="day-item">
                <div class="day-item-dot" style="background:${CAT_COLORS[t.category] || 'var(--accent)'}"></div>
                <div class="day-item-info">
                    <div class="day-item-title">${escHtml(t.title)}</div>
                    <div class="day-item-time">${t.time || 'All day'} · ${CATEGORY_ICONS[t.category] || ''} ${capitalize(t.category)}</div>
                </div>
            </div>
        `).join('');
    }

    renderCalendarTasks();
}

// ===== CALENDAR TASK LIST =====
function renderCalendarTasks() {
    const el = document.getElementById('calTaskList');
    if (!el) return;

    const today = todayStr();
    const allTasks = Store.getTasks()
        .filter(t => t.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || ''));

    if (allTasks.length === 0) {
        el.innerHTML = '<p class="empty-state" style="padding:20px 10px;">No upcoming tasks. Add one to get started!</p>';
        return;
    }

    el.innerHTML = allTasks.map(t => {
        const isCompleted = t.completed;
        const priorityClass = `badge priority-${t.priority}`;
        const catColor = CAT_COLORS[t.category] || 'var(--accent)';
        const catIcon = CATEGORY_ICONS[t.category] || '';

        return `
        <div class="cal-task-item ${isCompleted ? 'completed' : ''}">
            <div class="cal-task-check ${isCompleted ? 'checked' : ''}" data-id="${t.id}">${isCompleted ? '✓' : ''}</div>
            <div class="cal-task-info">
                <div class="cal-task-title">${escHtml(t.title)}</div>
                <div class="cal-task-meta">
                    ${formatDate(t.date)} · ${t.time || 'All day'}
                    <span class="${priorityClass}">${capitalize(t.priority)}</span>
                </div>
            </div>
            <div class="cal-task-dot" style="background:${catColor}" title="${catIcon} ${capitalize(t.category)}"></div>
        </div>`;
    }).join('');

    // Toggle completion
    el.querySelectorAll('.cal-task-check').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.dataset.id;
            const tasks = Store.getTasks();
            const task = tasks.find(t => t.id === id);
            if (task) {
                task.completed = !task.completed;
                Store.saveTasks(tasks);
                renderCalendar();
            }
        });
    });
}


// ===== TASKS & EVENTS =====
function renderTaskList() {
    let tasks = Store.getTasks();

    // Apply filter
    if (currentFilter === 'event') tasks = tasks.filter(t => t.type === 'event');
    else if (currentFilter === 'task') tasks = tasks.filter(t => t.type === 'task');
    else if (currentFilter === 'completed') tasks = tasks.filter(t => t.completed);

    // Sort: incomplete first, then by date
    tasks.sort((a, b) => {
        if (a.completed !== b.completed) return a.completed ? 1 : -1;
        return a.date.localeCompare(b.date);
    });

    if (tasks.length === 0) {
        dom.taskList.innerHTML = '<p class="empty-state">No items match your filter. Try adding some tasks or events!</p>';
        return;
    }

    dom.taskList.innerHTML = tasks.map(t => `
        <div class="task-item ${t.completed ? 'completed' : ''}" data-id="${t.id}">
            <div class="task-check ${t.completed ? 'checked' : ''}" data-id="${t.id}">${t.completed ? '✓' : ''}</div>
            <div class="task-item-body">
                <div class="task-item-title">${escHtml(t.title)}</div>
                <div class="task-item-meta">
                    <span>${formatDate(t.date)}${t.time ? ' · ' + formatTime12(t.time) : ''}</span>
                    <span class="badge type-${t.type}">${capitalize(t.type)}</span>
                    <span class="badge priority-${t.priority}">${capitalize(t.priority)}</span>
                    <span>${CATEGORY_ICONS[t.category] || ''} ${capitalize(t.category)}</span>
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit" data-id="${t.id}" title="Edit">✎</button>
                <button class="task-action-btn delete" data-id="${t.id}" title="Delete">🗑</button>
            </div>
        </div>
    `).join('');

    // Event handlers
    dom.taskList.querySelectorAll('.task-check').forEach(el => {
        el.addEventListener('click', () => toggleTaskComplete(el.dataset.id));
    });
    dom.taskList.querySelectorAll('.task-action-btn.edit').forEach(el => {
        el.addEventListener('click', () => openEditTask(el.dataset.id));
    });
    dom.taskList.querySelectorAll('.task-action-btn.delete').forEach(el => {
        el.addEventListener('click', () => {
            Store.deleteTask(el.dataset.id);
            renderTaskList();
            renderCalendar();
        });
    });
}

function toggleTaskComplete(id) {
    const tasks = Store.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        Store.saveTask(task);
        renderTaskList();
    }
}

function openEditTask(id) {
    const task = Store.getTasks().find(t => t.id === id);
    if (!task) return;
    dom.taskModalTitle.textContent = 'Edit Task / Event';
    dom.taskEditId.value = task.id;
    dom.taskTitle.value = task.title;
    dom.taskType.value = task.type;
    dom.taskCategory.value = task.category;
    dom.taskDate.value = task.date;
    dom.taskTime.value = task.time || '';
    dom.taskPriority.value = task.priority;
    dom.taskNotes.value = task.notes || '';
    dom.taskModal.classList.add('show');
}


// ===== EXPENSES =====
function renderExpenses() {
    const expenses = Store.getExpenses();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}`;

    // Summary
    const monthTransactions = expenses.filter(e => e.date.startsWith(currentMonth));
    let monthIncome = 0;
    let monthSpent = 0;

    monthTransactions.forEach(e => {
        if (e.type === 'income') monthIncome += e.amount;
        else monthSpent += e.amount;
    });

    const monthBalance = monthIncome - monthSpent;

    dom.monthTotal.textContent = `₹${monthBalance.toLocaleString('en-IN')}`;
    dom.incomeTotal.textContent = `₹${monthIncome.toLocaleString('en-IN')}`;
    dom.spentTotal.textContent = `₹${monthSpent.toLocaleString('en-IN')}`;

    // Top category
    const catTotals = {};
    monthTransactions.forEach(e => {
        if (e.type !== 'income') {
            catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
        }
    });
    const topCat = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
    dom.topCategory.textContent = topCat ? `${EXPENSE_ICONS[topCat[0]] || ''} ${capitalize(topCat[0])}` : '—';

    // Bar chart
    renderBarChart(catTotals);

    // Expense list (sorted newest first)
    const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    if (sorted.length === 0) {
        dom.expenseList.innerHTML = '<p class="empty-state">No transactions recorded. Click <strong>+ Add Expense</strong> to start tracking!</p>';
    } else {
        dom.expenseList.innerHTML = sorted.map(e => {
            const isIncome = e.type === 'income';
            const sign = isIncome ? '+' : '-';
            const amountClass = isIncome ? 'income' : 'expense';
            return `
            <div class="expense-item" data-id="${e.id}">
                <span class="expense-icon">${EXPENSE_ICONS[e.category] || '📦'}</span>
                <div class="expense-body">
                    <div class="expense-desc">${escHtml(e.description)}</div>
                    <div class="expense-date">${formatDate(e.date)} · ${capitalize(e.category)}</div>
                </div>
                <span class="expense-amount ${amountClass}">${sign}₹${e.amount.toLocaleString('en-IN')}</span>
                <button class="expense-delete" data-id="${e.id}" title="Delete">🗑</button>
            </div>
        `}).join('');

        dom.expenseList.querySelectorAll('.expense-delete').forEach(el => {
            el.addEventListener('click', () => {
                Store.deleteExpense(el.dataset.id);
                renderExpenses();
            });
        });
    }
}

function renderBarChart(catTotals) {
    const categories = ['food','transport','shopping','bills','entertainment','health','education','other'];
    const maxVal = Math.max(...categories.map(c => catTotals[c] || 0), 1);

    dom.barChart.innerHTML = categories.map(cat => {
        const val = catTotals[cat] || 0;
        const pct = (val / maxVal) * 100;
        return `
            <div class="bar-item">
                <span class="bar-amount">${val > 0 ? '₹' + val.toLocaleString('en-IN') : ''}</span>
                <div class="bar-fill ${cat}" style="height:${Math.max(pct, 3)}%"></div>
                <span class="bar-label">${EXPENSE_ICONS[cat]}<br>${capitalize(cat)}</span>
            </div>
        `;
    }).join('');
}


// ===== MODALS =====
function initModals() {
    // Task modal
    dom.addTaskBtn.addEventListener('click', () => openNewTask());
    dom.addFromCalendar.addEventListener('click', () => openNewTask(selectedDate));
    dom.closeTaskModal.addEventListener('click', () => dom.taskModal.classList.remove('show'));
    dom.taskModal.addEventListener('click', (e) => {
        if (e.target === dom.taskModal) dom.taskModal.classList.remove('show');
    });

    dom.taskForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const task = {
            id: dom.taskEditId.value || generateId(),
            title: dom.taskTitle.value.trim(),
            type: dom.taskType.value,
            category: dom.taskCategory.value,
            date: dom.taskDate.value,
            time: dom.taskTime.value || '',
            priority: dom.taskPriority.value,
            notes: dom.taskNotes.value.trim(),
            completed: false,
        };

        // Preserve completed status on edit
        if (dom.taskEditId.value) {
            const existing = Store.getTasks().find(t => t.id === task.id);
            if (existing) task.completed = existing.completed;
        }

        Store.saveTask(task);
        dom.taskModal.classList.remove('show');
        dom.taskForm.reset();
        dom.taskEditId.value = '';
        renderTaskList();
        renderCalendar();
    });

    // Expense modal
    dom.addExpenseBtn.addEventListener('click', () => {
        dom.expenseDate.value = todayStr();
        dom.expenseModal.classList.add('show');
    });
    dom.closeExpenseModal.addEventListener('click', () => dom.expenseModal.classList.remove('show'));
    dom.expenseModal.addEventListener('click', (e) => {
        if (e.target === dom.expenseModal) dom.expenseModal.classList.remove('show');
    });

    dom.expenseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const expense = {
            id: generateId(),
            type: dom.expenseType.value,
            description: dom.expenseDesc.value.trim(),
            amount: parseFloat(dom.expenseAmount.value),
            category: dom.expenseCategory.value,
            date: dom.expenseDate.value,
        };
        Store.saveExpense(expense);
        dom.expenseModal.classList.remove('show');
        dom.expenseForm.reset();
        renderExpenses();
    });
}

function openNewTask(date) {
    dom.taskModalTitle.textContent = 'Add Task / Event';
    dom.taskForm.reset();
    dom.taskEditId.value = '';
    dom.taskDate.value = date || todayStr();
    dom.taskModal.classList.add('show');
}


// ===== FILTER CHIPS =====
function initFilters() {
    dom.filterChips.forEach(chip => {
        chip.addEventListener('click', () => {
            dom.filterChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            currentFilter = chip.dataset.filter;
            renderTaskList();
        });
    });
}


// ===== CALENDAR NAV =====
function initCalendarNav() {
    dom.prevMonth.addEventListener('click', () => {
        calMonth--;
        if (calMonth < 0) { calMonth = 11; calYear--; }
        renderCalendar();
    });
    dom.nextMonth.addEventListener('click', () => {
        calMonth++;
        if (calMonth > 11) { calMonth = 0; calYear++; }
        renderCalendar();
    });
    dom.btnToday.addEventListener('click', () => {
        const now = new Date();
        calYear = now.getFullYear();
        calMonth = now.getMonth();
        selectedDate = todayStr();
        renderCalendar();
    });
}


// ===== HELPERS =====
function escHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatTime12(time24) {
    const [h, m] = time24.split(':').map(Number);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}


// ===== INIT =====
function init() {
    initState();
    renderHeader();
    initTabs();
    initCalendarNav();
    initFilters();
    initModals();

    // Calendar-view Add buttons
    const addTaskFromCal = document.getElementById('addTaskFromCal');
    if (addTaskFromCal) {
        addTaskFromCal.addEventListener('click', () => openNewTask(selectedDate));
    }
    if (dom.addFromCalendar) {
        dom.addFromCalendar.addEventListener('click', () => openNewTask(selectedDate));
    }

    // Wait for auth & data load before rendering
    Store.initAuth(() => {
        renderCalendar();
        renderTaskList();
        renderExpenses();
    });
}

document.addEventListener('DOMContentLoaded', init);

// ===== PWA SERVICE WORKER (TEMPORARILY DISABLED TO CLEAR CACHE) =====
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            for (let registration of registrations) {
                await registration.unregister();
                console.log('Service Worker unregistered successfully.');
            }
            // Force reload one time to ensure fresh cache
            if (!sessionStorage.getItem('sw_cleared')) {
                sessionStorage.setItem('sw_cleared', 'true');
                window.location.reload(true);
            }
        } catch (err) {
            console.error('Error during Service Worker cleanup:', err);
        }
    });
}
