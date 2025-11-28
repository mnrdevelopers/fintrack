import { auth, db } from './firebaseConfig.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    getDocs, 
    query, 
    where, 
    orderBy,
    getDoc 
} from 'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js';
import { formatCurrency, formatDate, showNotification, categoryColors, categoryIcons } from './ui.js';

let expenses = [];
let currentFilter = '';

// Initialize expenses page
export async function initializeExpenses() {
    if (!auth.currentUser) return;
    
    try {
        await loadExpenses();
        setupEventListeners();
        updateSummary();
    } catch (error) {
        console.error('Error initializing expenses:', error);
        showNotification('Error loading expenses', 'danger');
    }
}

// Load expenses from Firestore
async function loadExpenses() {
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;
    
    // Show skeleton loaders
    expensesList.innerHTML = `
        <div class="skeleton-expense"></div>
        <div class="skeleton-expense"></div>
        <div class="skeleton-expense"></div>
    `;
    
    const q = query(
        collection(db, 'users', auth.currentUser.uid, 'expenses'),
        orderBy('date', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    expenses = [];
    
    querySnapshot.forEach((doc) => {
        expenses.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    renderExpenses();
}

// Render expenses list
function renderExpenses() {
    const expensesList = document.getElementById('expensesList');
    if (!expensesList) return;
    
    if (expenses.length === 0) {
        expensesList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt fa-3x mb-3"></i>
                <h4>No expenses yet</h4>
                <p>Add your first expense to get started</p>
            </div>
        `;
        return;
    }
    
    let filteredExpenses = expenses;
    if (currentFilter) {
        filteredExpenses = expenses.filter(expense => expense.category === currentFilter);
    }
    
    expensesList.innerHTML = filteredExpenses.map(expense => `
        <div class="expense-item" data-category="${expense.category}" data-id="${expense.id}">
            <div class="expense-info">
                <div class="expense-category">
                    <i class="${categoryIcons[expense.category] || categoryIcons.Other} me-2"></i>
                    ${expense.category}
                </div>
                <div class="expense-note">${expense.note || 'No description'}</div>
                <div class="expense-date">${formatDate(expense.date)}</div>
            </div>
            <div class="expense-amount" style="color: ${categoryColors[expense.category] || categoryColors.Other}">
                ${formatCurrency(expense.amount)}
            </div>
            <div class="action-buttons">
                <button class="btn btn-sm btn-outline-danger delete-expense" data-id="${expense.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    // Add delete event listeners
    document.querySelectorAll('.delete-expense').forEach(button => {
        button.addEventListener('click', handleDeleteExpense);
    });
}

// Handle expense deletion
async function handleDeleteExpense(e) {
    const expenseId = e.currentTarget.getAttribute('data-id');
    const expenseItem = document.querySelector(`.expense-item[data-id="${expenseId}"]`);
    
    if (!confirm('Are you sure you want to delete this expense?')) {
        return;
    }
    
    try {
        // Add removing animation
        expenseItem.classList.add('removing');
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Delete from Firestore
        await deleteDoc(doc(db, 'users', auth.currentUser.uid, 'expenses', expenseId));
        
        // Remove from local array
        expenses = expenses.filter(expense => expense.id !== expenseId);
        
        // Re-render
        renderExpenses();
        updateSummary();
        
        showNotification('Expense deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting expense:', error);
        showNotification('Error deleting expense', 'danger');
    }
}

// Add new expense
async function addExpense(expenseData) {
    try {
        const docRef = await addDoc(collection(db, 'users', auth.currentUser.uid, 'expenses'), {
            ...expenseData,
            amount: parseFloat(expenseData.amount),
            date: expenseData.date,
            createdAt: new Date()
        });
        
        // Add to local array
        expenses.unshift({
            id: docRef.id,
            ...expenseData,
            amount: parseFloat(expenseData.amount)
        });
        
        renderExpenses();
        updateSummary();
        
        showNotification('Expense added successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error adding expense:', error);
        showNotification('Error adding expense', 'danger');
        return false;
    }
}

// Update summary statistics
function updateSummary() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    const todayTotal = expenses
        .filter(expense => new Date(expense.date) >= today)
        .reduce((sum, expense) => sum + expense.amount, 0);
    
    const weekTotal = expenses
        .filter(expense => new Date(expense.date) >= weekAgo)
        .reduce((sum, expense) => sum + expense.amount, 0);
    
    const monthTotal = expenses
        .filter(expense => new Date(expense.date) >= monthStart)
        .reduce((sum, expense) => sum + expense.amount, 0);
    
    // Update DOM elements
    const todayElement = document.getElementById('todayTotal');
    const weekElement = document.getElementById('weekTotal');
    const monthElement = document.getElementById('monthTotal');
    
    if (todayElement) todayElement.textContent = formatCurrency(todayTotal);
    if (weekElement) weekElement.textContent = formatCurrency(weekTotal);
    if (monthElement) monthElement.textContent = formatCurrency(monthTotal);
}

// Setup event listeners
function setupEventListeners() {
    // Add expense form
    const addExpenseForm = document.getElementById('addExpenseForm');
    if (addExpenseForm) {
        addExpenseForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const saveBtn = document.getElementById('saveExpenseBtn');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addExpenseModal'));
            
            saveBtn.classList.add('btn-loading');
            
            const formData = new FormData(addExpenseForm);
            const expenseData = {
                amount: formData.get('amount'),
                category: formData.get('category'),
                note: formData.get('note'),
                date: formData.get('date')
            };
            
            const success = await addExpense(expenseData);
            
            saveBtn.classList.remove('btn-loading');
            
            if (success) {
                addExpenseForm.reset();
                modal.hide();
            }
        });
    }
    
    // Category filter
    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            currentFilter = e.target.value;
            renderExpenses();
        });
    }
    
    // Modal show event - reset form
    const expenseModal = document.getElementById('addExpenseModal');
    if (expenseModal) {
        expenseModal.addEventListener('show.bs.modal', () => {
            const form = document.getElementById('addExpenseForm');
            if (form) form.reset();
        });
    }
}

// Get expenses for dashboard
export async function getRecentExpenses(limit = 5) {
    if (!auth.currentUser) return [];
    
    try {
        const q = query(
            collection(db, 'users', auth.currentUser.uid, 'expenses'),
            orderBy('date', 'desc'),
            limit(limit)
        );
        
        const querySnapshot = await getDocs(q);
        const recentExpenses = [];
        
        querySnapshot.forEach((doc) => {
            recentExpenses.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return recentExpenses;
    } catch (error) {
        console.error('Error getting recent expenses:', error);
        return [];
    }
}

// Get spending statistics for dashboard
export async function getSpendingStats() {
    if (!auth.currentUser) return { today: 0, month: 0 };
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    try {
        const expensesQuery = query(
            collection(db, 'users', auth.currentUser.uid, 'expenses'),
            where('
