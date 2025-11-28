let expenses = [];
let currentPeriod = 'current-month';

// Initialize reports page
async function initializeReports() {
    if (!firebase.auth().currentUser) return;
    
    try {
        await loadExpenses();
        setupEventListeners();
        updateReports();
    } catch (error) {
        console.error('Error initializing reports:', error);
        showNotification('Error loading reports', 'danger');
    }
}

// Load expenses for reports
async function loadExpenses() {
    const user = firebase.auth().currentUser;
    const expensesQuery = firebase.firestore()
        .collection('users')
        .doc(user.uid)
        .collection('expenses')
        .orderBy('date', 'desc');
    
    const querySnapshot = await expensesQuery.get();
    expenses = [];
    
    querySnapshot.forEach((doc) => {
        expenses.push({
            id: doc.id,
            ...doc.data()
        });
    });
}

// Get date range for selected period
function getDateRange(period) {
    const now = new Date();
    let startDate, endDate;
    
    switch (period) {
        case 'current-month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0);
            break;
        case 'last-3-months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'last-6-months':
            startDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            break;
        case 'current-year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31);
            break;
        default:
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }
    
    return { startDate, endDate };
}

// Filter expenses by period
function getFilteredExpenses() {
    const { startDate, endDate } = getDateRange(currentPeriod);
    
    return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
    });
}

// Update reports with current data
function updateReports() {
    const filteredExpenses = getFilteredExpenses();
    updateSummaryStats(filteredExpenses);
    updateCategoryBreakdown(filteredExpenses);
    renderCharts(filteredExpenses);
}

// Update summary statistics
function updateSummaryStats(expenses) {
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalTransactions = expenses.length;
    
    // Calculate average daily spending
    const { startDate, endDate } = getDateRange(currentPeriod);
    const daysInPeriod = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const averageDaily = totalSpent / daysInPeriod;
    
    // Find highest spending category
    const categoryTotals = {};
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    let highestCategory = 'None';
    let highestAmount = 0;
    
    Object.entries(categoryTotals).forEach(([category, amount]) => {
        if (amount > highestAmount) {
            highestAmount = amount;
            highestCategory = category;
        }
    });
    
    // Update DOM elements
    const totalElement = document.getElementById('totalSpent');
    const averageElement = document.getElementById('averageDaily');
    const transactionsElement = document.getElementById('totalTransactions');
    const highestElement = document.getElementById('highestCategory');
    
    if (totalElement) totalElement.textContent = formatCurrency(totalSpent);
    if (averageElement) averageElement.textContent = formatCurrency(averageDaily);
    if (transactionsElement) transactionsElement.textContent = totalTransactions;
    if (highestElement) highestElement.textContent = highestCategory;
}

// Update category breakdown
function updateCategoryBreakdown(expenses) {
    const categoryBreakdown = document.getElementById('categoryBreakdown');
    if (!categoryBreakdown) return;
    
    const categoryTotals = {};
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    // Sort categories by amount (descending)
    const sortedCategories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a);
    
    if (sortedCategories.length === 0) {
        categoryBreakdown.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-pie fa-3x mb-3"></i>
                <h4>No data available</h4>
                <p>No expenses found for the selected period</p>
            </div>
        `;
        return;
    }
    
    categoryBreakdown.innerHTML = sortedCategories.map(([category, amount]) => {
        const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
        
        return `
            <div class="category-item">
                <div class="category-name" style="color: ${categoryColors[category] || categoryColors.Other}">
                    <i class="fas fa-circle me-2"></i>
                    ${category}
                </div>
                <div class="category-bar">
                    <div class="category-fill" style="width: ${percentage}%; background: ${categoryColors[category] || categoryColors.Other}"></div>
                </div>
                <div class="category-percentage">
                    ${formatCurrency(amount)} (${percentage.toFixed(1)}%)
                </div>
            </div>
        `;
    }).join('');
}

// Render charts (simplified version - in production, use Chart.js or similar)
function renderCharts(expenses) {
    renderMonthlyChart(expenses);
    renderCategoryChart(expenses);
}

// Render monthly spending chart
function renderMonthlyChart(expenses) {
    const chartContainer = document.getElementById('monthlyChart');
    if (!chartContainer) return;
    
    // Group expenses by month
    const monthlyData = {};
    expenses.forEach(expense => {
        const date = new Date(expense.date);
        const monthKey = `${date.getFullYear()}-${date.getMonth() + 1}`;
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = {
                name: monthName,
                total: 0
            };
        }
        
        monthlyData[monthKey].total += expense.amount;
    });
    
    // Convert to array and sort by date
    const monthlyArray = Object.values(monthlyData).sort((a, b) => {
        return new Date(a.name) - new Date(b.name);
    });
    
    if (monthlyArray.length === 0) {
        chartContainer.innerHTML = '<div class="text-muted text-center py-5">No data available for chart</div>';
        return;
    }
    
    // Find max value for scaling
    const maxAmount = Math.max(...monthlyArray.map(item => item.total));
    
    // Create simple bar chart with HTML/CSS
    chartContainer.innerHTML = `
        <div class="chart-bars" style="display: flex; align-items: end; justify-content: space-between; height: 150px; padding: 0 1rem;">
            ${monthlyArray.map(item => {
                const height = maxAmount > 0 ? (item.total / maxAmount) * 100 : 0;
                return `
                    <div class="chart-bar-container" style="display: flex; flex-direction: column; align-items: center; flex: 1; margin: 0 0.25rem;">
                        <div class="chart-bar" 
                             style="height: ${height}%; 
                                    background: linear-gradient(to top, var(--primary), var(--secondary));
                                    width: 30px; 
                                    border-radius: 4px 4px 0 0;
                                    transition: height 0.5s ease;">
                        </div>
                        <div class="chart-label mt-2" style="font-size: 0.75rem; color: var(--gray); text-align: center;">
                            <div>${formatCurrency(item.total)}</div>
                            <div style="margin-top: 0.25rem;">${item.name}</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Render category pie chart (simplified)
function renderCategoryChart(expenses) {
    const chartContainer = document.getElementById('categoryChart');
    if (!chartContainer) return;
    
    const categoryTotals = {};
    const totalSpent = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    expenses.forEach(expense => {
        categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });
    
    const categories = Object.entries(categoryTotals)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 6); // Top 6 categories
    
    if (categories.length === 0) {
        chartContainer.innerHTML = '<div class="text-muted text-center py-5">No data available for chart</div>';
        return;
    }
    
    // Create simple donut chart with HTML/CSS
    chartContainer.innerHTML = `
        <div class="category-chart" style="display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem;">
            ${categories.map(([category, amount]) => {
                const percentage = totalSpent > 0 ? (amount / totalSpent) * 100 : 0;
                return `
                    <div class="category-chart-item" style="display: flex; align-items: center; gap: 0.5rem;">
                        <div class="color-indicator" style="width: 12px; height: 12px; border-radius: 50%; background: ${categoryColors[category] || categoryColors.Other}"></div>
                        <div style="font-size: 0.875rem;">
                            <div>${category}</div>
                            <div style="color: var(--gray); font-size: 0.75rem;">${percentage.toFixed(1)}%</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
}

// Setup event listeners
function setupEventListeners() {
    // Period selector
    const periodSelector = document.getElementById('reportPeriod');
    if (periodSelector) {
        periodSelector.addEventListener('change', (e) => {
            currentPeriod = e.target.value;
            updateReports();
        });
    }
}

// Get category statistics for dashboard
async function getCategoryStats() {
    if (!firebase.auth().currentUser) return {};
    
    try {
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const user = firebase.auth().currentUser;
        
        const expensesQuery = firebase.firestore()
            .collection('users')
            .doc(user.uid)
            .collection('expenses')
            .where('date', '>=', monthStart.toISOString().split('T')[0]);
        
        const querySnapshot = await expensesQuery.get();
        const categoryTotals = {};
        let totalSpent = 0;
        
        querySnapshot.forEach((doc) => {
            const expense = doc.data();
            categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
            totalSpent += expense.amount;
        });
        
        // Calculate percentages
        const categoryPercentages = {};
        Object.keys(categoryTotals).forEach(category => {
            categoryPercentages[category] = totalSpent > 0 ? (categoryTotals[category] / totalSpent) * 100 : 0;
        });
        
        return {
            totals: categoryTotals,
            percentages: categoryPercentages,
            totalSpent: totalSpent
        };
    } catch (error) {
        console.error('Error getting category stats:', error);
        return {};
    }
}

// Listen for global currency updates from UI.js
window.addEventListener('currency-updated', () => {
    // Re-render reports with new currency
    updateReports();
});

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    if (firebase.auth().currentUser && window.location.pathname.includes('reports.html')) {
        initializeReports();
    }
});
