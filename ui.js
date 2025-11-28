// UI Utility Functions

// App Settings State
const appSettings = {
    currency: 'USD',
    locale: 'en-US'
};

// Currency Configuration Map
const currencyMap = {
    'USD': { locale: 'en-US', symbol: '$', label: 'USD ($)', flag: '🇺🇸' },
    'INR': { locale: 'en-IN', symbol: '₹', label: 'INR (₹)', flag: '🇮🇳' },
    'EUR': { locale: 'de-DE', symbol: '€', label: 'EUR (€)', flag: '🇪🇺' },
    'GBP': { locale: 'en-GB', symbol: '£', label: 'GBP (£)', flag: '🇬🇧' }
};

// Global loader control
function showGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// Format currency based on App Settings
function formatCurrency(amount) {
    return new Intl.NumberFormat(appSettings.locale, {
        style: 'currency',
        currency: appSettings.currency
    }).format(amount);
}

// Update App Currency State and UI
function updateAppCurrency(currencyCode) {
    if (currencyMap[currencyCode]) {
        appSettings.currency = currencyCode;
        appSettings.locale = currencyMap[currencyCode].locale;
        
        // Update the dropdown button text if it exists
        const currencyLabel = document.getElementById('currentCurrencyLabel');
        if (currencyLabel) {
            currencyLabel.innerHTML = `${currencyMap[currencyCode].flag} ${currencyCode}`;
        }
        
        // Update active state in dropdown
        document.querySelectorAll('.currency-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.currency === currencyCode) {
                item.classList.add('active');
            }
        });
    }
}

// Change Currency (User Action)
async function changeCurrency(currencyCode) {
    if (!currencyMap[currencyCode]) return;
    
    // 1. Update State
    updateAppCurrency(currencyCode);
    
    // 2. Save to Firestore
    const user = firebase.auth().currentUser;
    if (user) {
        try {
            await firebase.firestore().collection('users').doc(user.uid).update({
                currency: currencyCode
            });
            
            // 3. Reload page to refresh all charts and lists with new currency
            showGlobalLoader();
            window.location.reload();
        } catch (error) {
            console.error('Error saving currency preference:', error);
            showNotification('Failed to save currency preference', 'danger');
        }
    }
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
    });
}

// Format date for input fields
function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Get greeting based on time of day
function getTimeGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
        animation: slideInRight 0.3s ease;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Custom Confirmation Modal Utility
function showConfirmModal(message, confirmText = 'Delete') {
    return new Promise(resolve => {
        const modalElement = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('confirmationModalMessage');
        const confirmBtn = document.getElementById('confirmModalBtn');
        
        if (!modalElement || !modalMessage || !confirmBtn) {
            console.error("Confirmation modal elements not found. Defaulting to true.");
            resolve(true);
            return;
        }

        modalMessage.textContent = message;
        confirmBtn.textContent = confirmText;

        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        newConfirmBtn.addEventListener('click', function handler() {
            modal.hide();
            resolve(true);
            newConfirmBtn.removeEventListener('click', handler);
        });

        modalElement.addEventListener('hidden.bs.modal', function handler() {
            if (newConfirmBtn.parentNode) {
                resolve(false);
            }
            modalElement.removeEventListener('hidden.bs.modal', handler);
        }, { once: true });
    });
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function initializeDateUI() {
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = formatDateForInput(new Date());
        }
    });
    
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    const timeGreeting = document.getElementById('timeGreeting');
    if (timeGreeting) {
        timeGreeting.textContent = getTimeGreeting();
    }
}

const categoryColors = {
    'Food': '#f59e0b',
    'Transport': '#3b82f6',
    'Shopping': '#8b5cf6',
    'Bills': '#ef4444',
    'Entertainment': '#ec4899',
    'Healthcare': '#10b981',
    'Other': '#6b7280'
};

const categoryIcons = {
    'Food': 'fas fa-utensils',
    'Transport': 'fas fa-car',
    'Shopping': 'fas fa-shopping-bag',
    'Bills': 'fas fa-file-invoice-dollar',
    'Entertainment': 'fas fa-film',
    'Healthcare': 'fas fa-heartbeat',
    'Other': 'fas fa-circle'
};

// Initialize page and Currency Listener
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        hideGlobalLoader();
    }, 1000);
    
    initializeDateUI();
    
    const animatedElements = document.querySelectorAll('.page-enter');
    animatedElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
    });
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                submitBtn.classList.remove('btn-loading'); 
                submitBtn.classList.add('btn-loading');
            }
        });
    });

    // Listen for currency selection clicks
    document.querySelectorAll('.currency-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const currency = e.currentTarget.dataset.currency;
            changeCurrency(currency);
        });
    });

    // Load User Preference on Startup
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            firebase.firestore().collection('users').doc(user.uid).get()
                .then((doc) => {
                    if (doc.exists && doc.data().currency) {
                        updateAppCurrency(doc.data().currency);
                        // Refresh active page parts if needed, but the basic formatCurrency calls
                        // inside render functions (expenses.js etc) will use the new settings 
                        // when they run.
                    }
                })
                .catch((error) => console.log("Error loading user settings:", error));
        }
    });
});
