let emis = [];
let currentStatusFilter = 'all';

// Initialize EMIs page
async function initializeEMIs() {
    if (!firebase.auth().currentUser) return;
    
    try {
        await loadEMIs();
        setupEventListeners();
        updateEMISummary();
    } catch (error) {
        console.error('Error initializing EMIs:', error);
        showNotification('Error loading EMIs', 'danger');
    }
}

// Load EMIs from Firestore
async function loadEMIs() {
    const emiList = document.getElementById('emiList');
    if (!emiList) return;
    
    // Show skeleton loaders
    emiList.innerHTML = `
        <div class="skeleton-emi"></div>
        <div class="skeleton-emi"></div>
        <div class="skeleton-emi"></div>
    `;
    
    const user = firebase.auth().currentUser;
    const q = firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('emis')
        .orderBy('startDate', 'desc');
    
    const querySnapshot = await q.get();
    emis = [];
    
    querySnapshot.forEach((doc) => {
        emis.push({
            id: doc.id,
            ...doc.data()
        });
    });
    
    renderEMIs();
}

// Render EMIs list
function renderEMIs() {
    const emiList = document.getElementById('emiList');
    if (!emiList) return;
    
    if (emis.length === 0) {
        emiList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-credit-card fa-3x mb-3"></i>
                <h4>No EMIs yet</h4>
                <p>Add your first EMI to get started</p>
            </div>
        `;
        return;
    }
    
    let filteredEMIs = emis;
    if (currentStatusFilter === 'active') {
        filteredEMIs = emis.filter(emi => emi.paidMonths < emi.totalMonths);
    } else if (currentStatusFilter === 'completed') {
        filteredEMIs = emis.filter(emi => emi.paidMonths >= emi.totalMonths);
    }
    
    emiList.innerHTML = filteredEMIs.map(emi => {
        const progress = (emi.paidMonths / emi.totalMonths) * 100;
        const remainingMonths = emi.totalMonths - emi.paidMonths;
        const isCompleted = emi.paidMonths >= emi.totalMonths;
        const nextDue = getNextDueDate(emi);
        const dueStatus = getDueStatus(nextDue);
        
        return `
            <div class="emi-item ${dueStatus} ${isCompleted ? 'completed' : ''}" data-id="${emi.id}">
                <div class="emi-info">
                    <div class="emi-title">
                        <i class="fas fa-credit-card me-2"></i>
                        ${emi.title}
                    </div>
                    <div class="emi-details">
                        ${formatCurrency(emi.monthlyAmount)} • ${remainingMonths} months left • Due ${formatDate(nextDue)}
                    </div>
                    <div class="emi-progress">
                        <div class="progress">
                            <div class="progress-bar" style="width: ${progress}%"></div>
                        </div>
                        <small class="text-muted">${emi.paidMonths}/${emi.totalMonths} months paid</small>
                    </div>
                </div>
                <div class="emi-amount">
                    ${formatCurrency(emi.monthlyAmount)}
                </div>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-outline-success mark-paid" data-id="${emi.id}" ${isCompleted ? 'disabled' : ''}>
                        <i class="fas fa-check"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger delete-emi" data-id="${emi.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
    
    // Add event listeners
    document.querySelectorAll('.mark-paid').forEach(button => {
        button.addEventListener('click', handleMarkPaid);
    });
    
    document.querySelectorAll('.delete-emi').forEach(button => {
        button.addEventListener('click', handleDeleteEMI);
    });
}

// Get next due date for EMI
function getNextDueDate(emi) {
    const startDate = new Date(emi.startDate);
    const currentDate = new Date();
    const monthsPassed = emi.paidMonths;
    
    const nextDue = new Date(startDate);
    nextDue.setMonth(startDate.getMonth() + monthsPassed);
    nextDue.setDate(emi.dueDate);
    
    return nextDue.toISOString().split('T')[0];
}

// Get due status for styling
function getDueStatus(dueDate) {
    const today = new Date();
    const due = new Date(dueDate);
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 3) return 'due-soon';
    return '';
}

// Handle mark as paid
async function handleMarkPaid(e) {
    const emiId = e.currentTarget.getAttribute('data-id');
    const emi = emis.find(e => e.id === emiId);
    
    if (!emi) return;
    
    try {
        const newPaidMonths = emi.paidMonths + 1;
        const user = firebase.auth().currentUser;
        
        // Update in Firestore
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .doc(emiId)
            .update({
                paidMonths: newPaidMonths
            });
        
        // Update local array
        emi.paidMonths = newPaidMonths;
        
        // Re-render
        renderEMIs();
        updateEMISummary();
        
        showNotification('EMI marked as paid', 'success');
    } catch (error) {
        console.error('Error updating EMI:', error);
        showNotification('Error updating EMI', 'danger');
    }
}

// Handle EMI deletion
async function handleDeleteEMI(e) {
    const emiId = e.currentTarget.getAttribute('data-id');
    const emiItem = document.querySelector(`.emi-item[data-id="${emiId}"]`);
    
    if (!confirm('Are you sure you want to delete this EMI?')) {
        return;
    }
    
    try {
        // Add removing animation
        emiItem.classList.add('removing');
        
        // Wait for animation to complete
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const user = firebase.auth().currentUser;
        // Delete from Firestore
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .doc(emiId)
            .delete();
        
        // Remove from local array
        emis = emis.filter(emi => emi.id !== emiId);
        
        // Re-render
        renderEMIs();
        updateEMISummary();
        
        showNotification('EMI deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting EMI:', error);
        showNotification('Error deleting EMI', 'danger');
    }
}

// Add new EMI
async function addEMI(emiData) {
    try {
        const user = firebase.auth().currentUser;
        const docRef = await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .add({
                ...emiData,
                monthlyAmount: parseFloat(emiData.monthlyAmount),
                totalMonths: parseInt(emiData.totalMonths),
                paidMonths: parseInt(emiData.paidMonths) || 0,
                dueDate: parseInt(emiData.dueDate),
                startDate: emiData.startDate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        // Add to local array
        emis.unshift({
            id: docRef.id,
            ...emiData,
            monthlyAmount: parseFloat(emiData.monthlyAmount),
            totalMonths: parseInt(emiData.totalMonths),
            paidMonths: parseInt(emiData.paidMonths) || 0,
            dueDate: parseInt(emiData.dueDate)
        });
        
        renderEMIs();
        updateEMISummary();
        
        showNotification('EMI added successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error adding EMI:', error);
        showNotification('Error adding EMI', 'danger');
        return false;
    }
}

// Update EMI summary statistics
function updateEMISummary() {
    const activeEMIs = emis.filter(emi => emi.paidMonths < emi.totalMonths);
    const monthlyTotal = activeEMIs.reduce((sum, emi) => sum + emi.monthlyAmount, 0);
    
    const dueSoonCount = emis.filter(emi => {
        if (emi.paidMonths >= emi.totalMonths) return false;
        const nextDue = getNextDueDate(emi);
        return getDueStatus(nextDue) === 'due-soon' || getDueStatus(nextDue) === 'overdue';
    }).length;
    
    // Update DOM elements
    const activeElement = document.getElementById('activeEMIs');
    const monthlyElement = document.getElementById('monthlyEMI');
    const dueElement = document.getElementById('dueSoon');
    
    if (activeElement) activeElement.textContent = activeEMIs.length;
    if (monthlyElement) monthlyElement.textContent = formatCurrency(monthlyTotal);
    if (dueElement) dueElement.textContent = dueSoonCount;
}

// Setup event listeners
function setupEventListeners() {
    // Add EMI form
    const addEMIForm = document.getElementById('addEMIForm');
    if (addEMIForm) {
        addEMIForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const saveBtn = document.getElementById('saveEMIBtn');
            const modal = bootstrap.Modal.getInstance(document.getElementById('addEMIModal'));
            
            saveBtn.classList.add('btn-loading');
            
            const formData = new FormData(addEMIForm);
            const emiData = {
                title: formData.get('title'),
                monthlyAmount: formData.get('monthlyAmount'),
                totalMonths: formData.get('totalMonths'),
                paidMonths: formData.get('paidMonths'),
                dueDate: formData.get('dueDate'),
                startDate: formData.get('startDate')
            };
            
            const success = await addEMI(emiData);
            
            saveBtn.classList.remove('btn-loading');
            
            if (success) {
                addEMIForm.reset();
                modal.hide();
            }
        });
    }
    
    // Status filter
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            currentStatusFilter = e.target.value;
            renderEMIs();
        });
    }
    
    // Modal show event - reset form and set default dates
    const emiModal = document.getElementById('addEMIModal');
    if (emiModal) {
        emiModal.addEventListener('show.bs.modal', () => {
            const form = document.getElementById('addEMIForm');
            if (form) {
                form.reset();
                // Set default start date to today
                const startDateInput = document.getElementById('emiStartDate');
                if (startDateInput) {
                    startDateInput.value = new Date().toISOString().split('T')[0];
                }
            }
        });
    }
}

// Get upcoming EMIs for dashboard
async function getUpcomingEMIs(limit = 3) {
    if (!firebase.auth().currentUser) return [];
    
    try {
        const user = firebase.auth().currentUser;
        const q = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .where('paidMonths', '<', 'totalMonths');
        
        const querySnapshot = await q.get();
        const upcomingEMIs = [];
        
        querySnapshot.forEach((doc) => {
            const emi = {
                id: doc.id,
                ...doc.data()
            };
            
            // Calculate next due date
            emi.nextDue = getNextDueDate(emi);
            emi.dueStatus = getDueStatus(emi.nextDue);
            
            upcomingEMIs.push(emi);
        });
        
        // Sort by due date and limit
        return upcomingEMIs
            .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting upcoming EMIs:', error);
        return [];
    }
}

// Get next EMI due for dashboard
async function getNextEMIDue() {
    const upcomingEMIs = await getUpcomingEMIs(1);
    return upcomingEMIs.length > 0 ? upcomingEMIs[0] : null;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (firebase.auth().currentUser && (window.location.pathname.includes('emis.html') || window.location.pathname.includes('dashboard.html'))) {
        initializeEMIs();
    }
});
