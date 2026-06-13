// js/app.js

/**
 * loginController - Handles user authentication, registration, and session token state.
 */
const loginController = {
  currentUser: null,
  token: null,

  signup: async function(email, password) {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        this.token = data.token;
        this.currentUser = { email };
        localStorage.setItem('timora_token', data.token);
        return { success: true, message: 'Signup successful!' };
      } else {
        return { success: false, message: data.message || 'Signup failed' };
      }
    } catch (error) {
      console.error('Signup error:', error);
      return { success: false, message: 'Server connection failed' };
    }
  },

  login: async function(email, password) {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      if (response.ok) {
        this.token = data.token;
        this.currentUser = { email };
        localStorage.setItem('timora_token', data.token);
        return { success: true, message: 'Login successful!' };
      } else {
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Server connection failed' };
    }
  },

  logout: function() {
    this.currentUser = null;
    this.token = null;
    localStorage.removeItem('timora_token');
    return { success: true, message: 'Logged out successfully' };
  },

  isAuthenticated: function() {
    this.token = this.token || localStorage.getItem('timora_token');
    return !!this.token;
  }
};

/**
 * mainController - Unified dashboard manager that now merges the spendingController logic
 * to track, edit, and summary-view income and expenses.
 */
const mainController = {
  transactions: [],
  summary: { totalIncome: 0, totalExpenses: 0, balance: 0 },

  // --- Merged Spending Controller Logic ---
  
  async loadTransactions() {
    try {
      const token = loginController.token || localStorage.getItem('timora_token');
      const response = await fetch('/api/tracker/transactions', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        this.transactions = await response.json();
        this.calculateSummary();
        return this.transactions;
      }
      throw new Error('Failed to load transactions');
    } catch (error) {
      console.error('Error loading transactions:', error);
      return [];
    }
  },

  async addTransaction(transaction) {
    // transaction structure: { type: 'income'|'expense', amount, category, description, date }
    try {
      const token = loginController.token || localStorage.getItem('timora_token');
      const endpoint = transaction.type === 'income' ? '/api/tracker/income' : '/api/tracker/expenses';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(transaction)
      });
      if (response.ok) {
        const newTx = await response.json();
        this.transactions.push(newTx);
        this.calculateSummary();
        return { success: true, transaction: newTx };
      }
      return { success: false, message: 'Failed to add transaction' };
    } catch (error) {
      console.error('Error adding transaction:', error);
      return { success: false, message: error.message };
    }
  },

  async updateTransaction(id, type, updatedData) {
    try {
      const token = loginController.token || localStorage.getItem('timora_token');
      const endpoint = type === 'income' ? `/api/tracker/income/${id}` : `/api/tracker/expenses/${id}`;
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(updatedData)
      });
      if (response.ok) {
        const updatedTx = await response.json();
        const index = this.transactions.findIndex(t => t.id === id && t.type === type);
        if (index !== -1) {
          this.transactions[index] = { ...this.transactions[index], ...updatedTx };
        }
        this.calculateSummary();
        return { success: true, transaction: updatedTx };
      }
      return { success: false, message: 'Failed to update transaction' };
    } catch (error) {
      console.error('Error updating transaction:', error);
      return { success: false, message: error.message };
    }
  },

  async deleteTransaction(id, type) {
    try {
      const token = loginController.token || localStorage.getItem('timora_token');
      const endpoint = type === 'income' ? `/api/tracker/income/${id}` : `/api/tracker/expenses/${id}`;
      const response = await fetch(endpoint, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        this.transactions = this.transactions.filter(t => !(t.id === id && t.type === type));
        this.calculateSummary();
        return { success: true };
      }
      return { success: false, message: 'Failed to delete transaction' };
    } catch (error) {
      console.error('Error deleting transaction:', error);
      return { success: false, message: error.message };
    }
  },

  calculateSummary() {
    let income = 0;
    let expenses = 0;
    this.transactions.forEach(t => {
      const val = parseFloat(t.amount);
      if (t.type === 'income') {
        income += val;
      } else {
        expenses += val;
      }
    });
    this.summary = {
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses
    };
  },

  getCategoryBreakdown() {
    const breakdown = {};
    this.transactions.forEach(t => {
      if (t.type === 'expense') {
        breakdown[t.category] = (breakdown[t.category] || 0) + parseFloat(t.amount);
      }
    });
    return breakdown;
  }
};

// Export to window object or modules for access
if (typeof window !== 'undefined') {
  window.loginController = loginController;
  window.mainController = mainController;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { loginController, mainController };
}
