let emis = [];
let currentStatusFilter = 'all';

// Initialize EMIs page
async function initializeEMIs() {
    if (!firebase.auth().currentUser) return;
    
    try {
        await loadEMIs();
        setupEventListeners();
        updateEMISummary();
        updateDashboardEMIs();
    } catch (error) {
        console.error('Error initializing EMIs:', error);
        showNotification('Error loading EMIs', 'danger');
    }
}

// Load EMIs from Firestore
async function loadEMIs() {
    const emiList = document.getElementById('emiList');
    if (emiList) {
        emiList.innerHTML = `
            <div class="skeleton-emi"></div>
            <div class="skeleton-emi"></div>
            <div class="skeleton-emi"></div>
        `;
    }
    
    const user = firebase.auth().currentUser;
    // Use onSnapshot for real-time updates
    firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('emis')
        .orderBy('startDate', 'desc')
        .onSnapshot(querySnapshot => {
            emis = [];
            querySnapshot.forEach((doc) => {
                emis.push({
                    id: doc.id,
                    ...doc.data()
                });
            });
            renderEMIs();
            updateEMISummary();
            updateDashboardEMIs();
        }, error => {
            console.error('Error listening to EMIs:', error);
            showNotification('Error loading real-time EMIs', 'danger');
        });
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
    due.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'overdue';
    if (diffDays <= 7) return 'due-soon';
    return '';
}

// Handle mark as paid
async function handleMarkPaid(e) {
    const emiId = e.currentTarget.getAttribute('data-id');
    const emi = emis.find(e => e.id === emiId);
    
    if (!emi) return;

    const confirmed = await showConfirmModal(
        `Mark "${emi.title}" for ${formatCurrency(emi.monthlyAmount)} as paid?`, 
        'Mark Paid'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        const newPaidMonths = emi.paidMonths + 1;
        const user = firebase.auth().currentUser;
        
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .doc(emiId)
            .update({
                paidMonths: newPaidMonths
            });
        
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

    const confirmed = await showConfirmModal(
        'This will permanently delete the EMI record. Are you sure?', 
        'Delete EMI'
    );
    
    if (!confirmed) {
        return;
    }
    
    try {
        emiItem.classList.add('removing');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const user = firebase.auth().currentUser;
        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .doc(emiId)
            .delete();
        
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
        const monthlyAmount = parseFloat(emiData.monthlyAmount);
        const totalMonths = parseInt(emiData.totalMonths);
        const paidMonths = parseInt(emiData.paidMonths) || 0;
        const dueDate = parseInt(emiData.dueDate);

        await firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis')
            .add({
                title: emiData.title,
                monthlyAmount: monthlyAmount,
                totalMonths: totalMonths,
                paidMonths: paidMonths,
                dueDate: dueDate,
                startDate: emiData.startDate,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        
        showNotification('EMI added successfully', 'success');
        return true;
    } catch (error) {
        console.error('Error adding EMI:', error);
        showNotification('Error adding EMI', 'danger');
        return false;
    }
}

// Update EMI summary statistics (EMIs Page)
function updateEMISummary() {
    const activeEMIs = emis.filter(emi => emi.paidMonths < emi.totalMonths);
    const monthlyTotal = activeEMIs.reduce((sum, emi) => sum + emi.monthlyAmount, 0);
    
    const dueSoonCount = emis.filter(emi => {
        if (emi.paidMonths >= emi.totalMonths) return false;
        const nextDue = getNextDueDate(emi);
        return getDueStatus(nextDue) === 'due-soon' || getDueStatus(nextDue) === 'overdue';
    }).length;
    
    const activeElement = document.getElementById('activeEMIs');
    const monthlyElement = document.getElementById('monthlyEMI');
    const dueElement = document.getElementById('dueSoon');
    
    if (activeElement) activeElement.textContent = activeEMIs.length;
    if (monthlyElement) monthlyElement.textContent = formatCurrency(monthlyTotal);
    if (dueElement) dueElement.textContent = dueSoonCount;
}

// Update Dashboard EMI Stats
async function updateDashboardEMIs() {
    const nextEMIEl = document.getElementById('nextEMI');
    const upcomingListEl = document.getElementById('upcomingEMIs');

    if (!nextEMIEl && !upcomingListEl) return;

    // Get next single EMI for the stat card
    if (nextEMIEl) {
        const nextEMI = await getNextEMIDue();
        if (nextEMI) {
            nextEMIEl.textContent = formatCurrency(nextEMI.monthlyAmount);
        } else {
            nextEMIEl.textContent = '--';
        }
    }

    // Get list for upcoming section
    if (upcomingListEl) {
        const upcomingEMIs = await getUpcomingEMIs(3);
        if (upcomingEMIs.length === 0) {
            upcomingListEl.innerHTML = '<div class="text-muted text-center py-3">No upcoming EMIs</div>';
        } else {
            upcomingListEl.innerHTML = upcomingEMIs.map(emi => {
                 return `
                    <div class="emi-item ${emi.dueStatus}">
                        <div class="emi-info">
                            <div class="emi-title">
                                <i class="fas fa-credit-card me-2"></i>
                                ${emi.title}
                            </div>
                            <div class="emi-details">Due ${formatDate(emi.nextDue)}</div>
                        </div>
                        <div class="emi-amount">
                            ${formatCurrency(emi.monthlyAmount)}
                        </div>
                    </div>
                 `;
            }).join('');
        }
    }
}

// Setup event listeners
function setupEventListeners() {
    const addEMIForm = document.getElementById('addEMIForm');
    if (addEMIForm) {
        addEMIForm.removeEventListener('submit', handleAddEMISubmit);
        addEMIForm.addEventListener('submit', handleAddEMISubmit);
    }
    
    const statusFilter = document.getElementById('statusFilter');
    if (statusFilter) {
        statusFilter.removeEventListener('change', handleStatusFilterChange);
        statusFilter.addEventListener('change', handleStatusFilterChange);
    }
    
    const emiModal = document.getElementById('addEMIModal');
    if (emiModal) {
        emiModal.addEventListener('show.bs.modal', () => {
            const form = document.getElementById('addEMIForm');
            if (form) {
                form.reset();
                const startDateInput = document.getElementById('emiStartDate');
                if (startDateInput) {
                    startDateInput.value = new Date().toISOString().split('T')[0];
                }
            }
        });
    }
}

async function handleAddEMISubmit(e) {
    e.preventDefault();
    const addEMIForm = e.currentTarget;
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
}

function handleStatusFilterChange(e) {
    currentStatusFilter = e.target.value;
    renderEMIs();
}


// Get upcoming EMIs for dashboard
async function getUpcomingEMIs(limit = 3) {
    if (!firebase.auth().currentUser) return [];
    
    try {
        const user = firebase.auth().currentUser;
        const q = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('emis'); 
        
        const querySnapshot = await q.get();
        const upcomingEMIs = [];
        
        querySnapshot.forEach((doc) => {
            const emi = {
                id: doc.id,
                ...doc.data()
            };

            if (emi.paidMonths >= emi.totalMonths) return; 

            emi.nextDue = getNextDueDate(emi);
            emi.dueStatus = getDueStatus(emi.nextDue);
            
            upcomingEMIs.push(emi);
        });
        
        return upcomingEMIs
            .sort((a, b) => new Date(a.nextDue) - new Date(b.nextDue))
            .slice(0, limit);
    } catch (error) {
        console.error('Error getting upcoming EMIs:', error);
        return [];
    }
}

async function getNextEMIDue() {
    const upcomingEMIs = await getUpcomingEMIs(1);
    return upcomingEMIs.length > 0 ? upcomingEMIs[0] : null;
}

// Listen for global currency updates from UI.js
window.addEventListener('currency-updated', () => {
    // Re-render EMIs with new currency
    renderEMIs();
    updateEMISummary();
    updateDashboardEMIs();
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('emis.html') || window.location.pathname.includes('dashboard.html')) {
        firebase.auth().onAuthStateChanged((user) => {
            if (user) {
                initializeEMIs();
            }
        });
    }
});
