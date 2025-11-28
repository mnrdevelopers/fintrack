// UI Utility Functions

// Global loader control
function showGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'flex';
}

function hideGlobalLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) loader.style.display = 'none';
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
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
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} notification`;
    notification.textContent = message;
    
    // Add styles
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
    
    // Remove after 3 seconds
    setTimeout(() => {
        // Use the defined slideOutRight animation
        notification.style.animation = 'slideOutRight 0.3s ease forwards';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// CRITICAL FIX: Custom Confirmation Modal Utility
function showConfirmModal(message, confirmText = 'Delete') {
    return new Promise(resolve => {
        const modalElement = document.getElementById('confirmationModal');
        const modalMessage = document.getElementById('confirmationModalMessage');
        const confirmBtn = document.getElementById('confirmModalBtn');
        
        if (!modalElement || !modalMessage || !confirmBtn) {
            console.error("Confirmation modal elements not found. Defaulting to true.");
            resolve(true); // Fallback in case HTML is missing
            return;
        }

        modalMessage.textContent = message;
        confirmBtn.textContent = confirmText;

        // Ensure we remove previous listeners to prevent multiple calls
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        const modal = new bootstrap.Modal(modalElement);
        modal.show();

        // Listener for the confirm button
        newConfirmBtn.addEventListener('click', function handler() {
            modal.hide();
            resolve(true);
            newConfirmBtn.removeEventListener('click', handler);
        });

        // Listener for modal close (cancel)
        modalElement.addEventListener('hidden.bs.modal', function handler() {
            // Check if the promise has already been resolved by the confirm button
            if (newConfirmBtn.parentNode) {
                resolve(false);
            }
            modalElement.removeEventListener('hidden.bs.modal', handler);
        }, { once: true });
    });
}


// Debounce function for search inputs
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

// Initialize date-related UI elements
function initializeDateUI() {
    // Set current date in date inputs
    const dateInputs = document.querySelectorAll('input[type="date"]');
    dateInputs.forEach(input => {
        if (!input.value) {
            input.value = formatDateForInput(new Date());
        }
    });
    
    // Update current date display
    const dateDisplay = document.getElementById('currentDate');
    if (dateDisplay) {
        dateDisplay.textContent = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
    
    // Update time greeting
    const timeGreeting = document.getElementById('timeGreeting');
    if (timeGreeting) {
        timeGreeting.textContent = getTimeGreeting();
    }
}

// Category color mapping
const categoryColors = {
    'Food': '#f59e0b',
    'Transport': '#3b82f6',
    'Shopping': '#8b5cf6',
    'Bills': '#ef4444',
    'Entertainment': '#ec4899',
    'Healthcare': '#10b981',
    'Other': '#6b7280'
};

// Category icons mapping
const categoryIcons = {
    'Food': 'fas fa-utensils',
    'Transport': 'fas fa-car',
    'Shopping': 'fas fa-shopping-bag',
    'Bills': 'fas fa-file-invoice-dollar',
    'Entertainment': 'fas fa-film',
    'Healthcare': 'fas fa-heartbeat',
    'Other': 'fas fa-circle'
};

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Hide global loader after page load
    setTimeout(() => {
        hideGlobalLoader();
    }, 1000);
    
    // Initialize date-related UI
    initializeDateUI();
    
    // Add animation to page elements
    const animatedElements = document.querySelectorAll('.page-enter');
    animatedElements.forEach((element, index) => {
        element.style.animationDelay = `${index * 0.1}s`;
    });
    
    // Handle bottom navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
        });
    });
    
    // Handle form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            if (submitBtn) {
                // Remove existing loading class to ensure the new one takes effect
                submitBtn.classList.remove('btn-loading'); 
                submitBtn.classList.add('btn-loading');
            }
        });
    });
});
