
// Expense Tracker Dashboard JavaScript
class ExpenseTracker {
    constructor() {
        this.expenses = JSON.parse(localStorage.getItem('expenses')) || [];
        this.init();
    }

    init() {
        this.bindEvents();
        this.updateSummary();
        this.renderTransactions();
        this.updateChart();
        this.updateSuggestions();
        this.setTodayDate();
    }

    bindEvents() {
        const form = document.getElementById('expenseForm');
        const clearBtn = document.getElementById('clearAllBtn');

        if (form) {
            form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => this.clearAllTransactions());
        }
    }

    setTodayDate() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.value = today;
        }
    }

    handleSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const expense = {
            id: Date.now(),
            title: formData.get('title'),
            amount: parseFloat(formData.get('amount')),
            type: formData.get('type'),
            category: formData.get('category'),
            date: formData.get('date')
        };

        this.addExpense(expense);
        this.showConfirmation();
        e.target.reset();
        this.setTodayDate();
    }

    addExpense(expense) {
        this.expenses.unshift(expense);
        this.saveToStorage();
        this.updateSummary();
        this.renderTransactions();
        this.updateChart();
        this.updateSuggestions();
    }

    deleteExpense(id) {
        this.expenses = this.expenses.filter(expense => expense.id !== id);
        this.saveToStorage();
        this.updateSummary();
        this.renderTransactions();
        this.updateChart();
        this.updateSuggestions();
    }

    clearAllTransactions() {
        if (this.expenses.length === 0) {
            this.showToast('No transactions to clear!', 'info');
            return;
        }

        if (confirm('Are you sure you want to delete all transactions? This action cannot be undone.')) {
            this.expenses = [];
            this.saveToStorage();
            this.updateSummary();
            this.renderTransactions();
            this.updateChart();
            this.updateSuggestions();
            this.showToast('All transactions cleared successfully!', 'success');
        }
    }

    saveToStorage() {
        localStorage.setItem('expenses', JSON.stringify(this.expenses));
    }

    updateSummary() {
        const totalIncome = this.expenses
            .filter(expense => expense.type === 'income')
            .reduce((sum, expense) => sum + expense.amount, 0);

        const totalExpenses = this.expenses
            .filter(expense => expense.type === 'expense')
            .reduce((sum, expense) => sum + expense.amount, 0);

        const totalBalance = totalIncome - totalExpenses;

        this.updateElement('totalBalance', this.formatCurrency(totalBalance));
        this.updateElement('totalIncome', this.formatCurrency(totalIncome));
        this.updateElement('totalExpenses', this.formatCurrency(totalExpenses));

        // Update balance card color based on balance
        const balanceCard = document.querySelector('.balance-card');
        if (balanceCard) {
            balanceCard.classList.remove('negative-balance');
            if (totalBalance < 0) {
                balanceCard.classList.add('negative-balance');
            }
        }
    }

    renderTransactions() {
        const container = document.getElementById('transactionsList');
        if (!container) return;

        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="no-transactions">
                    <i class="fas fa-receipt"></i>
                    <p>No transactions yet. Add your first transaction above!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.expenses.map(expense => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-title">${expense.title}</div>
                    <div class="transaction-meta">
                        <span class="category-tag category-${expense.category}">${this.getCategoryName(expense.category)}</span>
                        <span class="transaction-date">${this.formatDate(expense.date)}</span>
                    </div>
                </div>
                <div class="transaction-amount ${expense.type}">
                    ${expense.type === 'income' ? '+' : '-'}${this.formatCurrency(expense.amount)}
                </div>
                <button class="delete-btn" onclick="tracker.deleteExpense(${expense.id})" title="Delete transaction">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `).join('');
    }

    updateChart() {
        const canvas = document.getElementById('expenseChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
        }

        const expensesByCategory = this.getExpensesByCategory();
        const categories = Object.keys(expensesByCategory);
        const amounts = Object.values(expensesByCategory);

        if (categories.length === 0) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = '#666';
            ctx.font = '16px Open Sans';
            ctx.textAlign = 'center';
            ctx.fillText('No expenses to display', canvas.width / 2, canvas.height / 2);
            return;
        }

        const colors = this.getCategoryColors(categories);

        this.chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories.map(cat => this.getCategoryName(cat)),
                datasets: [{
                    data: amounts,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const total = amounts.reduce((sum, amount) => sum + amount, 0);
                                const percentage = ((context.raw / total) * 100).toFixed(1);
                                return `${context.label}: ${this.formatCurrency(context.raw)} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateRotate: true,
                    duration: 1000
                }
            }
        });

        this.updateChartLegend(categories, colors, amounts);
    }

    updateChartLegend(categories, colors, amounts) {
        const legendContainer = document.getElementById('chartLegend');
        if (!legendContainer) return;

        const total = amounts.reduce((sum, amount) => sum + amount, 0);

        legendContainer.innerHTML = categories.map((category, index) => {
            const percentage = ((amounts[index] / total) * 100).toFixed(1);
            return `
                <div class="legend-item">
                    <div class="legend-color" style="background-color: ${colors[index]}"></div>
                    <span>${this.getCategoryName(category)}: ${percentage}%</span>
                </div>
            `;
        }).join('');
    }

    getExpensesByCategory() {
        const expenses = this.expenses.filter(expense => expense.type === 'expense');
        const byCategory = {};

        expenses.forEach(expense => {
            if (byCategory[expense.category]) {
                byCategory[expense.category] += expense.amount;
            } else {
                byCategory[expense.category] = expense.amount;
            }
        });

        return byCategory;
    }

    getCategoryColors(categories) {
        const colorMap = {
            food: '#2ECC71',
            transportation: '#3498DB',
            shopping: '#E67E22',
            entertainment: '#9B59B6',
            bills: '#E74C3C',
            health: '#1ABC9C',
            education: '#F39C12',
            travel: '#34495E',
            other: '#95A5A6'
        };

        return categories.map(category => colorMap[category] || '#95A5A6');
    }

    updateSuggestions() {
        const container = document.getElementById('suggestionsGrid');
        if (!container) return;

        const suggestions = this.generateSuggestions();
        
        container.innerHTML = suggestions.map(suggestion => `
            <div class="suggestion-card ${suggestion.type}-card">
                <div class="suggestion-icon">
                    <i class="${suggestion.icon}"></i>
                </div>
                <div class="suggestion-content">
                    <h3>${suggestion.title}</h3>
                    <p>${suggestion.message}</p>
                </div>
            </div>
        `).join('');
    }

    generateSuggestions() {
        const suggestions = [];
        const totalExpenses = this.expenses
            .filter(expense => expense.type === 'expense')
            .reduce((sum, expense) => sum + expense.amount, 0);

        const totalIncome = this.expenses
            .filter(expense => expense.type === 'income')
            .reduce((sum, expense) => sum + expense.amount, 0);

        const expensesByCategory = this.getExpensesByCategory();
        const topCategory = Object.keys(expensesByCategory).reduce((a, b) => 
            expensesByCategory[a] > expensesByCategory[b] ? a : b, Object.keys(expensesByCategory)[0]
        );

        if (this.expenses.length === 0) {
            suggestions.push({
                type: 'tip',
                icon: 'fas fa-lightbulb',
                title: 'Get Started',
                message: 'Add your first transaction to begin tracking your expenses and gaining insights!'
            });
        } else {
            // Spending analysis
            if (totalExpenses > totalIncome * 0.8) {
                suggestions.push({
                    type: 'budget',
                    icon: 'fas fa-exclamation-triangle',
                    title: 'High Spending Alert',
                    message: 'You\'re spending over 80% of your income. Consider reviewing your budget.'
                });
            } else if (totalExpenses < totalIncome * 0.5) {
                suggestions.push({
                    type: 'achievement',
                    icon: 'fas fa-trophy',
                    title: 'Great Saving!',
                    message: 'You\'re saving more than 50% of your income. Keep up the excellent work!'
                });
            }

            // Category-specific suggestions
            if (topCategory && expensesByCategory[topCategory] > totalExpenses * 0.4) {
                suggestions.push({
                    type: 'tip',
                    icon: 'fas fa-chart-pie',
                    title: `${this.getCategoryName(topCategory)} Spending`,
                    message: `You're spending a lot on ${this.getCategoryName(topCategory).toLowerCase()}. Consider setting a budget for this category.`
                });
            }

            // Income suggestions
            if (totalIncome === 0) {
                suggestions.push({
                    type: 'tip',
                    icon: 'fas fa-plus-circle',
                    title: 'Add Income',
                    message: 'Don\'t forget to add your income sources to get a complete financial picture.'
                });
            }
        }

        // Default suggestions if none generated
        if (suggestions.length === 0) {
            suggestions.push(
                {
                    type: 'tip',
                    icon: 'fas fa-lightbulb',
                    title: 'Daily Tracking',
                    message: 'Track your expenses daily for better insights into your spending habits.'
                },
                {
                    type: 'budget',
                    icon: 'fas fa-piggy-bank',
                    title: 'Emergency Fund',
                    message: 'Try to save at least 3-6 months of expenses for emergencies.'
                }
            );
        }

        return suggestions.slice(0, 3); // Limit to 3 suggestions
    }

    getCategoryName(category) {
        const categoryNames = {
            food: '🍔 Food & Dining',
            transportation: '🚗 Transportation',
            shopping: '🛍️ Shopping',
            entertainment: '🎬 Entertainment',
            bills: '💡 Bills & Utilities',
            health: '🏥 Health & Fitness',
            education: '📚 Education',
            travel: '✈️ Travel',
            salary: '💼 Salary',
            freelance: '💻 Freelance',
            investment: '📈 Investment',
            other: '🔗 Other'
        };
        return categoryNames[category] || category;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(Math.abs(amount));
    }

    formatDate(dateString) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    showConfirmation() {
        const message = document.getElementById('confirmationMessage');
        if (message) {
            message.classList.add('show');
            setTimeout(() => {
                message.classList.remove('show');
            }, 3000);
        }
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add to page
        document.body.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// Initialize expense tracker when DOM is loaded
let tracker;
document.addEventListener('DOMContentLoaded', function() {
    tracker = new ExpenseTracker();
});

// Add toast styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    .toast {
        position: fixed;
        top: 100px;
        right: 20px;
        background: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        display: flex;
        align-items: center;
        gap: 10px;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        z-index: 1001;
        min-width: 250px;
    }
    
    .toast.show {
        transform: translateX(0);
    }
    
    .toast-success {
        border-left: 4px solid #2ECC71;
        color: #2ECC71;
    }
    
    .toast-info {
        border-left: 4px solid #3498DB;
        color: #3498DB;
    }
    
    .toast i {
        font-size: 1.2rem;
    }
    
    .negative-balance .card-amount {
        color: #E74C3C !important;
    }
    
    .negative-balance {
        border-left-color: #E74C3C !important;
    }
`;
document.head.appendChild(toastStyles);
