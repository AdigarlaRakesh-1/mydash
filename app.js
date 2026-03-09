import { 
    db, 
    auth, 
    googleProvider,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    signOut 
} from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    query, 
    where, 
    onSnapshot, 
    doc, 
    setDoc, 
    deleteDoc 
} from "firebase/firestore";

// ===== DATA STORE =====
const Store = {
    _tasks: [],
    _expenses: [],
    _notes: [],

    initLocalData(callback) {
        // We wait for Firebase Auth in init() before calling this
        const userId = window.currentUser?.uid;
        if (!userId) {
            console.error("No authenticated user found for sync.");
            return;
        }

        // 1. Setup real-time listeners for each collection
        this._setupListeners(userId, callback);

        // 2. Check for data migration (LocalStorage -> Firestore)
        this._checkMigration(userId);
    },

    _setupListeners(userId, callback) {
        let loadedCounts = 0;
        const totalCollections = 3;

        const checkDone = () => {
            loadedCounts++;
            if (loadedCounts === totalCollections && callback) {
                document.querySelector('.app-layout').style.display = 'flex';
                callback();
            }
        };

        // Tasks
        onSnapshot(query(collection(db, "tasks"), where("userId", "==", userId)), (snapshot) => {
            this._tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (loadedCounts < totalCollections) checkDone();
            if (typeof renderCalendar === 'function') renderCalendar();
            if (typeof renderTaskList === 'function') renderTaskList();
        });

        // Expenses
        onSnapshot(query(collection(db, "expenses"), where("userId", "==", userId)), (snapshot) => {
            this._expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (loadedCounts < totalCollections) checkDone();
            if (typeof renderExpenses === 'function') renderExpenses();
            if (typeof renderRecentExpenses === 'function') renderRecentExpenses();
        });

        // Notes
        onSnapshot(query(collection(db, "notes"), where("userId", "==", userId)), (snapshot) => {
            this._notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (loadedCounts < totalCollections) checkDone();
            if (typeof renderNotesList === 'function') renderNotesList();
        });
    },

    async _checkMigration(userId) {
        const localTasks = localStorage.getItem('mydash_tasks');
        const localExpenses = localStorage.getItem('mydash_expenses');
        const localNotes = localStorage.getItem('mydash_notes');
        
        if (!localTasks && !localExpenses && !localNotes) return;

        console.log("Starting migration to Firestore...");

        if (localTasks) {
            const tasks = JSON.parse(localTasks);
            for (const t of tasks) {
                const { id, ...data } = t;
                await setDoc(doc(db, "tasks", id || generateId()), { ...data, userId });
            }
            localStorage.removeItem('mydash_tasks');
        }

        if (localExpenses) {
            const expenses = JSON.parse(localExpenses);
            for (const e of expenses) {
                const { id, ...data } = e;
                await setDoc(doc(db, "expenses", id || generateId()), { ...data, userId });
            }
            localStorage.removeItem('mydash_expenses');
        }

        if (localNotes) {
            const notes = JSON.parse(localNotes);
            for (const n of notes) {
                const { id, ...data } = n;
                await setDoc(doc(db, "notes", id || generateId()), { ...data, userId });
            }
            localStorage.removeItem('mydash_notes');
        }

        console.log("Migration complete!");
    },

    getTasks() { return this._tasks; },
    getExpenses() { return this._expenses; },
    getNotes() { return this._notes; },

    async saveNote(note) {
        const userId = window.currentUser.uid;
        const id = note.id || generateId();
        await setDoc(doc(db, "notes", id), { ...note, id, userId });
    },

    async deleteNote(id) {
        await deleteDoc(doc(db, "notes", id));
    },

    async saveTask(task) {
        const userId = window.currentUser.uid;
        const id = task.id || generateId();
        await setDoc(doc(db, "tasks", id), { ...task, id, userId });
        console.log("Task saved to Firestore:", id);
    },

    async deleteTask(id) {
        await deleteDoc(doc(db, "tasks", id));
    },

    async saveExpense(exp) {
        const userId = window.currentUser.uid;
        const id = exp.id || generateId();
        await setDoc(doc(db, "expenses", id), { ...exp, id, userId });
        console.log("Expense saved to Firestore:", id);
    },

    async deleteExpense(id) {
        await deleteDoc(doc(db, "expenses", id));
    }
};


// ===== UTILITIES =====
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

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
    work: '💼', personal: '🏠', health: '💪', finance: '💰', study: '📚', birthday: '🎈'
};

const EXPENSE_ICONS = {
    salary: '💰', food: '🍔', transport: '🚗', shopping: '🛍️', bills: '📄',
    entertainment: '🎬', health: '💊', education: '📚', other: '📦'
};

const CAT_COLORS = {
    work: 'var(--accent)', personal: 'var(--green)',
    health: 'var(--orange)', finance: 'var(--purple)', study: 'var(--blue)', birthday: 'var(--pink)'
};


// ===== DOM REFS =====
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const DAILY_QUOTES = [
    "The secret of getting ahead is getting started. – Mark Twain",
    "It's hard to beat a person who never gives up. – Babe Ruth",
    "If you can dream it, you can do it. – Walt Disney",
    "Don't wait. The time will never be just right. – Napoleon Hill",
    "Everything you've ever wanted is on the other side of fear. – George Addair",
    "Do what you can, with what you have, where you are. – Theodore Roosevelt",
    "Action is the foundational key to all success. – Pablo Picasso",
    "It always seems impossible until it's done. – Nelson Mandela",
    "Success is not final, failure is not fatal: it is the courage to continue that counts. – Winston Churchill",
    "Believe you can and you're halfway there. – Theodore Roosevelt",
    "The only way to do great work is to love what you do. – Steve Jobs",
    "Your limitation—it's only your imagination.",
    "Push yourself, because no one else is going to do it for you.",
    "Sometimes later becomes never. Do it now.",
    "Great things never come from comfort zones.",
    "Dream it. Wish it. Do it.",
    "Success doesn't just find you. You have to go out and get it.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Dream bigger. Do bigger.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Little things make big days.",
    "It's going to be hard, but hard does not mean impossible.",
    "Don't wait for opportunity. Create it.",
    "Sometimes we're tested not to show our weaknesses, but to discover our strengths.",
    "The key to success is to focus on goals, not obstacles.",
    "Dream it. Believe it. Build it.",
    "Motivation is what gets you started. Habit is what keeps you going. – Jim Ryun",
    "You don't have to be great to start, but you have to start to be great. – Zig Ziglar",
    "A year from now you may wish you had started today. – Karen Lamb"
];

const dom = {
    sidebarDate: $('#sidebarDate'),
    topBarDate: $('#topBarDate'),
    pageTitle: $('#pageTitle'),
    navItems: $$('.nav-item[data-tab]'),
    tabContents: $$('.tab-content'),
    sidebar: $('#sidebar'),
    mobileMenuBtn: $('#mobileMenuBtn'),
    navQuickAdd: $('#navQuickAdd'),

    // Calendar
    calMonthTitle: $('#calMonthTitle'),
    calCells: $('#calendarCells'),
    prevMonth: $('#prevMonth'),
    nextMonth: $('#nextMonth'),
    btnToday: $('#btnToday'),
    dayDetailPanel: $('#dayDetailPanel'),
    dayDetailTitle: $('#dayDetailTitle'),
    dayDetailContent: $('#dayDetailContent'),
    addFromCalendar: $('#addFromCalendar'),

    // Dashboard Widgets
    calRecentExpenses: $('#calRecentExpenses'),
    dailyQuoteContent: $('#dailyQuoteContent'),

    // Tasks
    addTaskBtn: $('#addTaskBtn'),
    taskList: $('#taskList'),
    filterChips: $$('.filter-chip'),

    // Expenses
    addExpenseBtn: $('#addExpenseBtn'),
    monthTotal: $('#monthTotal'),
    incomeTotal: $('#incomeTotal'),
    spentTotal: $('#spentTotal'),
    barChart: $('#barChart'),
    expenseList: $('#expenseList'),

    // Notes Manager
    noteList: $('#noteList'),
    btnNewNote: $('#btnNewNote'),
    noteTitle: $('#noteTitle'),
    editorContainer: $('#editor-container'),
    noteSaveStatus: $('#noteSaveStatus'),
    btnSaveNote: $('#btnSaveNote'),
    btnDeleteNote: $('#btnDeleteNote'),

    // Task Modal
    taskModal: $('#taskModal'),
    closeTaskModal: $('#closeTaskModal'),
    taskForm: $('#taskForm'),
    taskModalTitle: $('#taskModalTitle'),
    taskEditId: $('#taskEditId'),
    taskTitle: $('#taskTitle'),
    taskType: $('#taskType'),
    taskCategory: $('#taskCategory'),
    taskDate: $('#taskDate'),
    taskTime: $('#taskTime'),
    taskPriority: $('#taskPriority'),
    taskNotes: $('#taskNotes'),

    // Expense Modal
    expenseModal: $('#expenseModal'),
    closeExpenseModal: $('#closeExpenseModal'),
    expenseForm: $('#expenseForm'),
    expenseType: $('#expenseType'),
    expenseDesc: $('#expenseDesc'),
    expenseAmount: $('#expenseAmount'),
    expenseCategory: $('#expenseCategory'),
    expenseDate: $('#expenseDate'),
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
const TAB_TITLES = { calendar: 'Calendar', tasks: 'Tasks & Events', expenses: 'Expenses', notes: 'My Notes' };

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
            // notes tab doesn't need a specific render function

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
        dom.mobileMenuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dom.sidebar.classList.toggle('open');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (dom.sidebar.classList.contains('open') && 
                !dom.sidebar.contains(e.target) && 
                e.target !== dom.mobileMenuBtn) {
                dom.sidebar.classList.remove('open');
            }
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
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
        .filter(t => (t.date || '') >= today)
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || ''));

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
        return (a.date || '').localeCompare(b.date || '');
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
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    // Summary
    const monthTransactions = expenses.filter(e => e.date.startsWith(currentMonth));
    let monthIncome = 0;
    let monthSpent = 0;

    monthTransactions.forEach(e => {
        if (e.type === 'income') monthIncome += e.amount;
        else monthSpent += e.amount;
    });

    const monthBalance = monthIncome - monthSpent;
    const balanceText = monthBalance < 0 ? `-₹${Math.abs(monthBalance).toLocaleString('en-IN')}` : `₹${monthBalance.toLocaleString('en-IN')}`;

    dom.monthTotal.textContent = balanceText;
    dom.incomeTotal.textContent = `₹${monthIncome.toLocaleString('en-IN')}`;
    dom.spentTotal.textContent = `₹${monthSpent.toLocaleString('en-IN')}`;

    // Top category (for bar chart data only)
    const catTotals = {};
    monthTransactions.forEach(e => {
        if (e.type !== 'income') {
            catTotals[e.category] = (catTotals[e.category] || 0) + e.amount;
        }
    });

    // Bar chart
    renderBarChart(catTotals);

    // Expense list (sorted newest first)
    const sorted = [...expenses].sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const idA = a.id || '';
        const idB = b.id || '';
        return dateB.localeCompare(dateA) || idB.localeCompare(idA);
    });
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
    const categories = ['food', 'transport', 'shopping', 'bills', 'entertainment', 'health', 'education', 'other'];
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


// ===== DASHBOARD WIDGETS =====
function initDashboardWidgets() {
    // 1. Daily Quote Widget
    if (dom.dailyQuoteContent) {
        const dayOfMonth = new Date().getDate();
        const quoteObj = DAILY_QUOTES[(dayOfMonth - 1) % DAILY_QUOTES.length];
        const parts = quoteObj.split(' – ');
        const text = parts[0] || quoteObj;
        const author = parts[1] ? '– ' + parts[1] : '';
        dom.dailyQuoteContent.querySelector('.quote-text').textContent = text;
        dom.dailyQuoteContent.querySelector('.quote-author').textContent = author;
    }
}

function renderRecentExpenses() {
    const expenses = Store.getExpenses();
    const sorted = [...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5); // top 5
    if (sorted.length === 0) {
        dom.calRecentExpenses.innerHTML = '<p class="empty-state">No recent expenses.</p>';
        return;
    }
    dom.calRecentExpenses.innerHTML = sorted.map(e => `
        <div class="expense-item small" style="padding: 8px 12px; margin-bottom: 8px; font-size: 0.9em;">
            <span class="expense-icon">${EXPENSE_ICONS[e.category] || '📦'}</span>
            <div class="expense-body">
                <div class="expense-desc">${escHtml(e.description)}</div>
                <div class="expense-date">${formatDate(e.date)}</div>
            </div>
            <span class="expense-amount ${e.type === 'income' ? 'income' : 'expense'}">${e.type === 'income' ? '+' : '-'}₹${e.amount.toLocaleString('en-IN')}</span>
        </div>
    `).join('');
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


// ===== NOTES MANAGER =====
let activeNoteId = null;
let quill;

function renderNotesList() {
    const notes = Store.getNotes();
    if (notes.length === 0) {
        dom.noteList.innerHTML = '<p class="empty-state">No notes saved. Create one!</p>';
        return;
    }

    // Sort by newest first
    const sorted = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date));

    dom.noteList.innerHTML = sorted.map(n => `
        <div class="note-list-item ${n.id === activeNoteId ? 'active' : ''}" data-id="${n.id}">
            <div class="note-list-title">${escHtml(n.title || 'Untitled Note')}</div>
            <div class="note-list-date">${formatDate(n.date)}</div>
        </div>
    `).join('');

    dom.noteList.querySelectorAll('.note-list-item').forEach(el => {
        el.addEventListener('click', () => openNote(el.dataset.id));
    });
}

function openNote(id) {
    const note = Store.getNotes().find(n => n.id === id);
    if (!note) return;
    
    activeNoteId = note.id;
    dom.noteTitle.value = note.title;
    if (quill) quill.root.innerHTML = note.content || '';
    dom.btnDeleteNote.classList.remove('hidden');
    renderNotesList(); // Update active class
}

function createNewNote() {
    activeNoteId = null;
    dom.noteTitle.value = '';
    if (quill) quill.root.innerHTML = '';
    dom.btnDeleteNote.classList.add('hidden');
    dom.noteTitle.focus();
    renderNotesList();
}

function initNotes() {
    // Initialize Quill Rich Text Editor
    quill = new Quill('#editor-container', {
        theme: 'snow',
        placeholder: 'Start writing something...',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'header': [1, 2, 3, false] }],
                [{ 'color': [] }, { 'background': [] }],
                ['clean']
            ]
        }
    });

    dom.btnNewNote.addEventListener('click', createNewNote);

    // Save Button
    dom.btnSaveNote.addEventListener('click', () => {
        const textContent = quill.getText().trim();
        if (!textContent && !dom.noteTitle.value.trim()) return;

        dom.btnSaveNote.disabled = true;
        dom.btnSaveNote.textContent = 'Saving...';
        
        const note = {
            id: activeNoteId || generateId(),
            title: dom.noteTitle.value.trim(),
            content: quill.root.innerHTML,
            date: todayStr()
        };
        
        Store.saveNote(note);
        activeNoteId = note.id; // ensure it stays active
        renderNotesList();
        
        // Show delete button now that it's saved
        dom.btnDeleteNote.classList.remove('hidden');

        setTimeout(() => {
            dom.btnSaveNote.textContent = 'Saved!';
            dom.btnSaveNote.classList.add('success');
            
            setTimeout(() => {
                dom.btnSaveNote.disabled = false;
                dom.btnSaveNote.textContent = 'Save Note';
                dom.btnSaveNote.classList.remove('success');
            }, 1000);
        }, 300);
    });

    // Delete Button (Double-click to confirm, bypassing blocked window.confirm)
    dom.btnDeleteNote.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (!activeNoteId) return;
        
        if (dom.btnDeleteNote.textContent === 'Delete') {
            dom.btnDeleteNote.textContent = 'Sure?';
            dom.btnDeleteNote.style.backgroundColor = 'var(--red)';
            dom.btnDeleteNote.style.color = '#fff';
            
            // Reset back to "Delete" after 3 seconds if not clicked again
            setTimeout(() => {
                dom.btnDeleteNote.textContent = 'Delete';
                dom.btnDeleteNote.style.backgroundColor = '';
                dom.btnDeleteNote.style.color = '';
            }, 3000);
            return;
        }

        // Second click confirmed!
        Store.deleteNote(activeNoteId);
        createNewNote();
        renderNotesList();
        
        // Reset button appearance entirely
        dom.btnDeleteNote.textContent = 'Delete';
        dom.btnDeleteNote.style.backgroundColor = '';
        dom.btnDeleteNote.style.color = '';
        dom.btnDeleteNote.classList.add('hidden');
    });
}

// ===== NOTIFICATIONS & PWA =====
async function requestNotificationPermission() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
        await Notification.requestPermission();
    }
}

async function checkDailyAlerts() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return;

    const today = todayStr();
    const storageKey = `mydash_alerts_seen_${today}`;
    let seenAlerts = [];
    try {
        const localSeen = localStorage.getItem(storageKey);
        if (localSeen) seenAlerts = JSON.parse(localSeen);
    } catch (e) {}

    const tasks = Store.getTasks();
    const todayTasks = tasks.filter(t => t.date === today && !seenAlerts.includes(t.id));

    if (todayTasks.length === 0) return;

    const registration = await navigator.serviceWorker.ready;
    
    todayTasks.forEach(t => {
        let title = 'Dashboard Alert';
        let body = t.title;

        if (t.type === 'birthday' || t.category === 'birthday') {
            title = '🎂 Birthday Today!';
            body = `It's ${t.title}'s birthday today!`;
        } else if (t.type === 'event') {
            title = '📅 Event Today';
        } else {
            title = '✅ Task Due';
        }

        registration.showNotification(title, {
            body: body,
            icon: 'icons/icon-192.png',
            badge: 'icons/icon-192.png',
            tag: t.id,
            renotify: true
        });

        seenAlerts.push(t.id);
    });

    localStorage.setItem(storageKey, JSON.stringify(seenAlerts));
}

async function initPWA() {
    if ('serviceWorker' in navigator) {
        try {
            await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker registered');
        } catch (e) {
            console.error('Service Worker registration failed', e);
        }
    }
    
    // Request permission and check for alerts
    await requestNotificationPermission();
    await checkDailyAlerts();
}

async function triggerManualTestNotif() {
    const statusEl = document.getElementById('testerStatus');
    if (Notification.permission !== 'granted') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            statusEl.textContent = '❌ Permission Denied';
            return;
        }
    }

    statusEl.textContent = '⏳ Alert in 5s... Lock your screen!';
    
    setTimeout(async () => {
        try {
            const registration = await navigator.serviceWorker.ready;
            registration.showNotification('Dashboard Test Alert', {
                body: '📲 If you see this, mobile app notifications are working!',
                icon: 'icons/icon-192.png',
                badge: 'icons/icon-192.png',
                tag: 'test-notif',
                renotify: true
            });
            statusEl.textContent = '✅ Notification Sent!';
            setTimeout(() => { statusEl.textContent = ''; }, 3000);
        } catch (e) {
            statusEl.textContent = '❌ Error triggering alert';
        }
    }, 5000);
}


// ===== AUTH HANDLERS =====
function showAuthError(message) {
    const statusEl = document.getElementById('authStatus');
    statusEl.textContent = message;
    statusEl.className = 'auth-status error';
}

async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        showAuthError("❌ Login failed: " + error.message);
    }
}

async function handleSignup(e) {
    e.preventDefault();
    const email = document.getElementById('signupEmail').value;
    const pass = document.getElementById('signupPassword').value;
    try {
        await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        showAuthError("❌ Signup failed: " + error.message);
    }
}

async function handleGoogleLogin() {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        showAuthError("❌ Google Login failed: " + error.message);
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.reload(); // Refresh to reset all states
    } catch (error) {
        console.error("Logout error:", error);
    }
}

function initAuthUI() {
    const toSignup = document.getElementById('toSignup');
    const toLogin = document.getElementById('toLogin');
    const loginContainer = document.getElementById('loginFormContainer');
    const signupContainer = document.getElementById('signupFormContainer');
    const authSubtitle = document.getElementById('authSubtitle');

    toSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        signupContainer.classList.remove('hidden');
        authSubtitle.textContent = "Start your journey today.";
    });

    toLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
        authSubtitle.textContent = "Manage your life, beautifully.";
    });

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('signupForm').addEventListener('submit', handleSignup);
    document.getElementById('btnGoogleLogin').addEventListener('click', handleGoogleLogin);
    
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
}


// ===== INIT =====
async function init() {
    initAuthUI();

    // Wait for the persistent auth observer in firebase-config.js
    const user = await window.firebaseAuthLoaded;
    
    if (user) {
        // Hide overlay, show app
        document.getElementById('authOverlay').style.display = 'none';
        document.querySelector('.app-layout').style.display = 'flex';
        
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

        // Notification Tester
        const btnTestNotif = document.getElementById('btnTestNotif');
        if (btnTestNotif) {
            btnTestNotif.addEventListener('click', () => triggerManualTestNotif());
        }

        Store.initLocalData(() => {
            initNotes();
            renderNotesList();
            if (Store.getNotes().length > 0) {
                openNote(Store.getNotes()[0].id);
            } else {
                createNewNote();
            }
            renderCalendar();
            renderTaskList();
            renderExpenses();
            renderRecentExpenses();
            initDashboardWidgets();
            initPWA();
        });
    } else {
        // Not logged in: show overlay
        document.getElementById('authOverlay').style.display = 'flex';
        document.querySelector('.app-layout').style.display = 'none';
    }
}
// Finalize app script
console.log('App.js loaded');
document.addEventListener('DOMContentLoaded', init);
