// Global state
let currentUser = null;
const db = firebase.firestore();
const auth = firebase.auth();
const collections = {
    expenses: 'expenses',
    income: 'income',
    emis: 'emis'
};

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    // Check Auth
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            initApp();
        } else {
            window.location.href = 'auth.html';
        }
    });

    // Navigation Handler
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            if (link.classList.contains('logout-link')) return; // Let logout function handle it
            e.preventDefault();
            const targetId = link.getAttribute('data-target');
            switchView(targetId);
            
            // Close sidebar on mobile after click
            if(window.innerWidth < 992) toggleSidebar();
        });
    });
    
    // Internal links (e.g. "See All" on dashboard)
    document.querySelectorAll('.nav-link-trigger').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            switchView(targetId);
        });
    });

    // Sidebar Toggle
    document.getElementById('hamburgerBtn').addEventListener('click', toggleSidebar);
    document.getElementById('sidebarOverlay').addEventListener('click', toggleSidebar);

    // Form Submits
    document.getElementById('addExpenseForm').addEventListener('submit', handleAddTransaction);
    document.getElementById('addIncomeForm').addEventListener('submit', handleAddTransaction);
    document.getElementById('addEMIForm').addEventListener('submit', handleAddEMI);

    // Set Default Date Inputs
    const today = new Date().toISOString().split('T')[0];
    document.querySelectorAll('input[type="date"]').forEach(inp => inp.value = today);
});

function initApp() {
    updateProfileUI();
    loadDashboard(); // Load initial data
}

// --- NAVIGATION & UI ---
function switchView(viewId) {
    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => view.classList.remove('active'));
    // Show target view
    document.getElementById(`view-${viewId}`).classList.add('active');
    
    // Update Nav Active State
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('data-target') === viewId) link.classList.add('active');
    });

    // Update Header Title
    const titles = {
        dashboard: 'Dashboard',
        expenses: 'My Expenses',
        income: 'My Income',
        emis: 'EMI Planner',
        reports: 'Financial Reports',
        profile: 'My Profile',
        settings: 'Settings'
    };
    document.getElementById('pageTitle').textContent = titles[viewId] || 'FinTrack';

    // Show/Hide FAB
    const fab = document.getElementById('mainFab');
    if (viewId === 'dashboard' || viewId === 'expenses' || viewId === 'income') {
        fab.style.display = 'block';
    } else {
        fab.style.display = 'none';
    }

    // Trigger Data Refresh based on view
    if (viewId === 'dashboard') loadDashboard();
    if (viewId === 'expenses') loadTransactions('expense');
    if (viewId === 'income') loadTransactions('income');
    if (viewId === 'emis') loadEMIs();
    if (viewId === 'reports') generateReports();
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function updateProfileUI() {
    const name = currentUser.displayName || currentUser.email.split('@')[0];
    document.getElementById('sidebarUserName').textContent = name;
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('dashUserName').textContent = name.split(' ')[0];
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR'
    }).format(amount);
}

// --- DATA LOGIC ---

// 1. Transactions (Income & Expenses)
async function handleAddTransaction(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const type = formData.get('type'); // 'expense' or 'income'
    const collectionName = type === 'expense' ? collections.expenses : collections.income;
    const modalId = type === 'expense' ? '#addExpenseModal' : '#addIncomeModal';

    try {
        await db.collection('users').doc(currentUser.uid).collection(collectionName).add({
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category'),
            date: formData.get('date'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Close Modal
        const modalEl = document.querySelector(modalId);
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
        form.reset();
        
        // Refresh
        loadDashboard();
        if(document.getElementById(`view-${type}s`).classList.contains('active')) {
            loadTransactions(type); // Refresh list if on that page
        }
        
    } catch (error) {
        console.error("Error adding transaction: ", error);
        alert("Failed to save. Please try again.");
    }
}

function loadTransactions(type) {
    const collectionName = type === 'expense' ? collections.expenses : collections.income;
    const listId = type === 'expense' ? 'expensesList' : 'incomeList';
    const totalId = type === 'expense' ? 'expensesTotal' : 'incomeTotal';
    
    db.collection('users').doc(currentUser.uid).collection(collectionName)
        .orderBy('date', 'desc')
        .get()
        .then(snapshot => {
            let html = '';
            let total = 0;
            
            if(snapshot.empty) {
                document.getElementById(listId).innerHTML = '<div class="text-center text-muted p-4">No records found.</div>';
                document.getElementById(totalId).textContent = formatCurrency(0);
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                total += data.amount;
                const iconClass = getCategoryIcon(data.category);
                const colorClass = type === 'expense' ? 'text-danger' : 'text-success';
                const sign = type === 'expense' ? '-' : '+';
                
                html += `
                    <div class="transaction-item">
                        <div class="d-flex align-items-center">
                            <div class="t-icon bg-secondary bg-opacity-10 ${colorClass}">
                                <i class="${iconClass}"></i>
                            </div>
                            <div>
                                <h6 class="mb-0">${data.category}</h6>
                                <small class="text-muted">${data.date}</small>
                            </div>
                        </div>
                        <div class="fw-bold ${colorClass}">
                            ${sign}${formatCurrency(data.amount)}
                        </div>
                    </div>
                `;
            });

            document.getElementById(listId).innerHTML = html;
            document.getElementById(totalId).textContent = formatCurrency(total);
        });
}

// 2. EMIs
async function handleAddEMI(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        await db.collection('users').doc(currentUser.uid).collection(collections.emis).add({
            title: formData.get('title'),
            monthlyAmount: parseFloat(formData.get('monthlyAmount')),
            totalMonths: parseInt(formData.get('totalMonths')),
            paidMonths: parseInt(formData.get('paidMonths')),
            startDate: formData.get('startDate'),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        const modal = bootstrap.Modal.getInstance(document.getElementById('addEMIModal'));
        modal.hide();
        e.target.reset();
        loadEMIs();
    } catch (error) {
        console.error("Error adding EMI", error);
    }
}

function loadEMIs() {
    db.collection('users').doc(currentUser.uid).collection(collections.emis)
        .orderBy('startDate', 'desc')
        .get()
        .then(snapshot => {
            const list = document.getElementById('emiList');
            if(snapshot.empty) {
                list.innerHTML = '<div class="text-center text-muted p-4">No active EMIs.</div>';
                return;
            }

            let html = '';
            snapshot.forEach(doc => {
                const data = doc.data();
                const progress = (data.paidMonths / data.totalMonths) * 100;
                
                html += `
                    <div class="transaction-item d-block mb-3">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h6 class="mb-0"><i class="fas fa-file-invoice-dollar me-2 text-warning"></i>${data.title}</h6>
                            <span class="badge bg-warning text-dark">${formatCurrency(data.monthlyAmount)}/mo</span>
                        </div>
                        <div class="progress" style="height: 6px; background: rgba(255,255,255,0.1);">
                            <div class="progress-bar bg-warning" style="width: ${progress}%"></div>
                        </div>
                        <div class="d-flex justify-content-between mt-1">
                            <small class="text-muted">${data.paidMonths} / ${data.totalMonths} Paid</small>
                            <button class="btn btn-link btn-sm p-0 text-white" onclick="deleteDoc('emis', '${doc.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `;
            });
            list.innerHTML = html;
        });
}

// 3. Dashboard Summary
async function loadDashboard() {
    const uid = currentUser.uid;
    
    // Get Income
    const incomeSnap = await db.collection('users').doc(uid).collection(collections.income).get();
    let totalIncome = 0;
    incomeSnap.forEach(doc => totalIncome += doc.data().amount);
    
    // Get Expenses
    const expenseSnap = await db.collection('users').doc(uid).collection(collections.expenses).get();
    let totalExpense = 0;
    let recentTxns = [];
    expenseSnap.forEach(doc => {
        const d = doc.data();
        totalExpense += d.amount;
        recentTxns.push({...d, type: 'expense'});
    });

    // Get Active EMIs cost
    const emiSnap = await db.collection('users').doc(uid).collection(collections.emis).get();
    let monthlyEMICost = 0;
    emiSnap.forEach(doc => {
        const d = doc.data();
        if(d.paidMonths < d.totalMonths) monthlyEMICost += d.monthlyAmount;
    });

    // Update UI
    document.getElementById('dashIncome').textContent = formatCurrency(totalIncome);
    document.getElementById('dashExpenses').textContent = formatCurrency(totalExpense);
    document.getElementById('dashEMI').textContent = formatCurrency(monthlyEMICost);
    document.getElementById('dashBalance').textContent = formatCurrency(totalIncome - totalExpense);

    // Recent Transactions (Sort latest 3 expenses)
    recentTxns.sort((a,b) => new Date(b.date) - new Date(a.date));
    const recentHtml = recentTxns.slice(0, 3).map(t => `
        <div class="transaction-item">
            <div class="d-flex align-items-center">
                <div class="t-icon bg-danger bg-opacity-10 text-danger">
                    <i class="${getCategoryIcon(t.category)}"></i>
                </div>
                <div>
                    <h6 class="mb-0">${t.category}</h6>
                    <small class="text-muted">${t.date}</small>
                </div>
            </div>
            <div class="fw-bold text-danger">
                -${formatCurrency(t.amount)}
            </div>
        </div>
    `).join('');
    
    document.getElementById('dashRecentTransactions').innerHTML = recentHtml || '<small class="text-muted">No recent transactions</small>';
}

// 4. Reports (Simplified)
function generateReports() {
    // Ideally use Chart.js, here we simulate with simple DOM bars
    const box = document.getElementById('monthlyChart');
    box.innerHTML = '<p class="text-center text-muted mt-5">Chart visualization requires a library like Chart.js. <br> Data is aggregated here.</p>';
    
    // Simple Category Breakdown
    db.collection('users').doc(currentUser.uid).collection(collections.expenses).get()
    .then(snap => {
        const categories = {};
        let total = 0;
        snap.forEach(doc => {
            const d = doc.data();
            categories[d.category] = (categories[d.category] || 0) + d.amount;
            total += d.amount;
        });

        let html = '';
        for (const [cat, amount] of Object.entries(categories)) {
            const percent = ((amount / total) * 100).toFixed(1);
            html += `
                <div class="mb-3">
                    <div class="d-flex justify-content-between mb-1">
                        <span>${cat}</span>
                        <span>${percent}%</span>
                    </div>
                    <div class="progress" style="height: 6px; background: rgba(255,255,255,0.1);">
                        <div class="progress-bar bg-primary" style="width: ${percent}%"></div>
                    </div>
                </div>
            `;
        }
        document.getElementById('categoryBreakdown').innerHTML = html || 'No data';
    });
}

// Utilities
function getCategoryIcon(category) {
    const map = {
        'Food': 'fas fa-utensils',
        'Transport': 'fas fa-car',
        'Shopping': 'fas fa-shopping-bag',
        'Bills': 'fas fa-file-invoice-dollar',
        'Entertainment': 'fas fa-film',
        'Salary': 'fas fa-briefcase',
        'Business': 'fas fa-store',
        'Investment': 'fas fa-chart-line'
    };
    return map[category] || 'fas fa-circle';
}

function deleteDoc(collectionName, docId) {
    if(confirm('Delete this item?')) {
        db.collection('users').doc(currentUser.uid).collection(collectionName).doc(docId).delete()
        .then(() => {
            if(collectionName === 'emis') loadEMIs();
        });
    }
}

function logoutUser() {
    auth.signOut().then(() => window.location.href = 'index.html');
}
