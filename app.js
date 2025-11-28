// Main App Controller
class FinTrackApp {
    constructor() {
        this.currentPage = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initializeFirebase();
        this.loadUserData();
    }

    setupEventListeners() {
        // Sidebar toggle
        document.getElementById('menuToggle').addEventListener('click', () => this.toggleSidebar());
        document.getElementById('closeSidebar').addEventListener('click', () => this.toggleSidebar());
        
        // Navigation
        document.querySelectorAll('.nav-link, .sidebar-nav .nav-item').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.getAttribute('data-page') || link.closest('.nav-item').getAttribute('data-page');
                this.navigateTo(page);
                this.toggleSidebar(false);
            });
        });

        // Add buttons
        document.getElementById('addIncomeBtn').addEventListener('click', () => {
            const modal = new bootstrap.Modal(document.getElementById('addIncomeModal'));
            modal.show();
        });

        // Form submissions
        document.getElementById('addExpenseForm').addEventListener('submit', (e) => this.handleAddExpense(e));
        document.getElementById('addIncomeForm').addEventListener('submit', (e) => this.handleAddIncome(e));
        document.getElementById('addEMIForm').addEventListener('submit', (e) => this.handleAddEMI(e));
        document.getElementById('saveSettings').addEventListener('click', () => this.saveSettings());
    }

    toggleSidebar(show) {
        const sidebar = document.getElementById('appSidebar');
        const backdrop = document.querySelector('.sidebar-backdrop') || this.createBackdrop();
        
        if (show !== undefined) {
            sidebar.classList.toggle('active', show);
            backdrop.classList.toggle('active', show);
        } else {
            sidebar.classList.toggle('active');
            backdrop.classList.toggle('active');
        }
    }

    createBackdrop() {
        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        backdrop.addEventListener('click', () => this.toggleSidebar(false));
        document.body.appendChild(backdrop);
        return backdrop;
    }

    navigateTo(page) {
        // Hide all pages
        document.querySelectorAll('.page-content').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        
        // Show target page
        const targetPage = document.getElementById(`${page}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
            document.getElementById('pageTitle').textContent = this.getPageTitle(page);
            
            // Activate corresponding nav item
            document.querySelector(`.nav-item[data-page="${page}"]`).classList.add('active');
            
            this.currentPage = page;
            this.loadPageData(page);
        }
    }

    getPageTitle(page) {
        const titles = {
            'dashboard': 'Dashboard',
            'expenses': 'Expenses',
            'income': 'Income',
            'emis': 'EMIs',
            'reports': 'Reports',
            'profile': 'Profile',
            'settings': 'Settings'
        };
        return titles[page] || 'FinTrack';
    }

    async loadPageData(page) {
        switch (page) {
            case 'dashboard':
                await this.loadDashboardData();
                break;
            case 'expenses':
                await this.loadExpensesData();
                break;
            case 'income':
                await this.loadIncomeData();
                break;
            case 'emis':
                await this.loadEMIsData();
                break;
            case 'reports':
                await this.loadReportsData();
                break;
            case 'profile':
                await this.loadProfileData();
                break;
        }
    }

    async loadDashboardData() {
        // Implementation for dashboard data loading
        const stats = await getSpendingStats();
        const recentExpenses = await getRecentExpenses(5);
        const upcomingEMIs = await getUpcomingEMIs(3);
        const incomeStats = await getIncomeStats();
        
        this.updateDashboardUI(stats, recentExpenses, upcomingEMIs, incomeStats);
    }

    updateDashboardUI(stats, expenses, emis, income) {
        // Update today's spending
        document.getElementById('todaySpent').textContent = formatCurrency(stats.today);
        document.getElementById('monthSpent').textContent = formatCurrency(stats.month);
        document.getElementById('monthIncome').textContent = formatCurrency(income.monthly);
        document.getElementById('nextEMI').textContent = emis.length > 0 ? formatCurrency(emis[0].monthlyAmount) : '--';
        
        // Update recent expenses
        this.renderRecentExpenses(expenses);
        
        // Update upcoming EMIs
        this.renderUpcomingEMIs(emis);
    }

    renderRecentExpenses(expenses) {
        const container = document.getElementById('recentExpenses');
        if (expenses.length === 0) {
            container.innerHTML = '<div class="empty-state"><p>No recent expenses</p></div>';
            return;
        }
        
        container.innerHTML = expenses.map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-category">
                        <i class="${categoryIcons[expense.category] || categoryIcons.Other} me-2"></i>
                        ${expense.category}
                    </div>
                    <div class="expense-note">${expense.note || 'No description'}</div>
                </div>
                <div class="expense-amount">${formatCurrency(expense.amount)}</div>
            </div>
        `).join('');
    }

    // Similar methods for other pages...

    async handleAddExpense(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const expenseData = {
            amount: parseFloat(formData.get('amount')),
            category: formData.get('category'),
            note: formData.get('note'),
            date: formData.get('date')
        };
        
        const success = await addExpense(expenseData);
        if (success) {
            e.target.reset();
            bootstrap.Modal.getInstance(document.getElementById('addExpenseModal')).hide();
            this.loadPageData(this.currentPage);
        }
    }

    async handleAddIncome(e) {
        e.preventDefault();
        const formData = new FormData(e.target);
        const incomeData = {
            amount: parseFloat(formData.get('amount')),
            source: formData.get('source'),
            description: formData.get('description'),
            date: formData.get('date')
        };
        
        const success = await addIncome(incomeData);
        if (success) {
            e.target.reset();
            bootstrap.Modal.getInstance(document.getElementById('addIncomeModal')).hide();
            this.loadPageData(this.currentPage);
        }
    }

    // Initialize when DOM is ready
    initializeFirebase() {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                this.loadUserData();
                this.loadPageData(this.currentPage);
            } else {
                window.location.href = 'login.html';
            }
        });
    }

    loadUserData() {
        const user = firebase.auth().currentUser;
        if (user) {
            document.getElementById('userName').textContent = user.displayName || user.email.split('@')[0];
            document.getElementById('userDisplayName').textContent = user.displayName || user.email.split('@')[0];
            document.getElementById('profileUserName').textContent = user.displayName || 'User';
            document.getElementById('profileUserEmail').textContent = user.email;
        }
    }
}

// Currency formatting for INR
function formatCurrency(amount, currency = 'INR') {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.finTrackApp = new FinTrackApp();
});
