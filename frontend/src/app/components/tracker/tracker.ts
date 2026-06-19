import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Chart } from 'chart.js/auto';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-tracker',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './tracker.html',
  styleUrl: './tracker.scss'
})
export class Tracker implements OnInit, AfterViewInit {
  incomeList: any[] = [];
  expensesList: any[] = [];
  allIncomeList: any[] = [];
  allExpensesList: any[] = [];
  displayedColumns = ['date', 'category', 'description', 'amount', 'actions'];

  // Period Filtering State
  selectedPeriod = 'all';
  availablePeriods: { value: string; label: string }[] = [];
  filterFromDate = '';
  filterToDate = '';


  // Form State
  trackerForm!: FormGroup;
  isFormOpen = false;
  formMode: 'add' | 'edit' = 'add';
  currentTransactionType: 'income' | 'expense' = 'expense';
  editingId: number | null = null;

  // Categories
  incomeCategories = ['Salary', 'Freelance', 'Investments', 'Refunds', 'Gifts', 'Other'];
  expenseCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Rent', 'Entertainment', 'Health', 'Other'];
  showCustomCategoryInput = false;

  // Charts
  @ViewChild('expenseChartCanvas') expenseChartCanvas!: ElementRef;
  @ViewChild('compareChartCanvas') compareChartCanvas!: ElementRef;
  expenseChart: any = null;
  compareChart: any = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadData();
  }

  ngAfterViewInit() {
    // We will render charts once data is loaded
  }

  initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.trackerForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      category: ['', Validators.required],
      customCategory: [''],
      description: [''],
      date: [today, Validators.required]
    });
    this.showCustomCategoryInput = false;
  }

  onCategoryChange(val: string) {
    this.showCustomCategoryInput = val === 'CUSTOM_CATEGORY';
    const customControl = this.trackerForm.get('customCategory');
    if (this.showCustomCategoryInput) {
      customControl?.setValidators([Validators.required]);
    } else {
      customControl?.clearValidators();
      customControl?.setValue('');
    }
    customControl?.updateValueAndValidity();
  }

  onPeriodChange(val: string) {
    this.selectedPeriod = val;
    if (val === 'custom') {
      if (!this.filterFromDate || !this.filterToDate) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        this.filterFromDate = `${yyyy}-${mm}-01`;
        this.filterToDate = `${yyyy}-${mm}-${dd}`;
      }
    }
    this.filterDataByPeriod();
  }

  onFromDateChange(val: string) {
    this.filterFromDate = val;
    this.filterDataByPeriod();
  }

  onToDateChange(val: string) {
    this.filterToDate = val;
    this.filterDataByPeriod();
  }

  generatePeriods() {
    const periodsSet = new Set<string>();
    
    const scanList = [...this.allIncomeList, ...this.allExpensesList];
    scanList.forEach(item => {
      if (item.date) {
        try {
          const d = new Date(item.date);
          if (!isNaN(d.getTime())) {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            periodsSet.add(`${year}-${month}`);
          }
        } catch (e) {
          console.error(e);
        }
      }
    });

    if (periodsSet.size === 0) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      periodsSet.add(`${year}-${month}`);
    }

    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    this.availablePeriods = Array.from(periodsSet)
      .sort()
      .reverse()
      .map(pVal => {
        const [y, m] = pVal.split('-');
        const monthIndex = parseInt(m, 10) - 1;
        return {
          value: pVal,
          label: `${monthNames[monthIndex]} ${y}`
        };
      });
  }

  filterDataByPeriod() {
    if (this.selectedPeriod === 'all') {
      this.incomeList = [...this.allIncomeList];
      this.expensesList = [...this.allExpensesList];
    } else if (this.selectedPeriod === 'custom') {
      const filterFn = (item: any) => {
        if (!item.date) return false;
        const itemDate = new Date(item.date);
        if (isNaN(itemDate.getTime())) return false;

        if (this.filterFromDate) {
          const from = new Date(this.filterFromDate);
          from.setHours(0, 0, 0, 0);
          if (itemDate < from) return false;
        }
        if (this.filterToDate) {
          const to = new Date(this.filterToDate);
          to.setHours(23, 59, 59, 999);
          if (itemDate > to) return false;
        }
        return true;
      };

      this.incomeList = this.allIncomeList.filter(filterFn);
      this.expensesList = this.allExpensesList.filter(filterFn);
    } else {
      const [targetYear, targetMonth] = this.selectedPeriod.split('-');
      
      const filterFn = (item: any) => {
        if (!item.date) return false;
        const d = new Date(item.date);
        return d.getFullYear().toString() === targetYear && 
               String(d.getMonth() + 1).padStart(2, '0') === targetMonth;
      };

      this.incomeList = this.allIncomeList.filter(filterFn);
      this.expensesList = this.allExpensesList.filter(filterFn);
    }
    
    setTimeout(() => this.renderCharts(), 50);
  }

  loadData() {
    this.api.getIncome().subscribe({
      next: (income) => {
        this.allIncomeList = income;
        
        // Dynamically add stored income categories
        if (income) {
          income.forEach((item: any) => {
            const cat = item.category;
            if (cat && !this.incomeCategories.includes(cat)) {
              const otherIndex = this.incomeCategories.indexOf('Other');
              if (otherIndex !== -1) {
                this.incomeCategories.splice(otherIndex, 0, cat);
              } else {
                this.incomeCategories.push(cat);
              }
            }
          });
        }

        this.api.getExpenses().subscribe({
          next: (expenses) => {
            this.allExpensesList = expenses;

            // Dynamically add stored expense categories
            if (expenses) {
              expenses.forEach((item: any) => {
                const cat = item.category;
                if (cat && !this.expenseCategories.includes(cat)) {
                  const otherIndex = this.expenseCategories.indexOf('Other');
                  if (otherIndex !== -1) {
                    this.expenseCategories.splice(otherIndex, 0, cat);
                  } else {
                    this.expenseCategories.push(cat);
                  }
                }
              });
            }

            // Generate periods list from raw data
            this.generatePeriods();

            // Reset selected period to 'all' if the selected period is no longer available
            const periodExists = this.availablePeriods.some(p => p.value === this.selectedPeriod);
            if (this.selectedPeriod !== 'all' && !periodExists) {
              this.selectedPeriod = 'all';
            }

            // Filter and refresh display
            this.filterDataByPeriod();
          },
          error: (err) => console.error('Error loading expenses:', err)
        });
      },
      error: (err) => console.error('Error loading income:', err)
    });
  }

  openAddForm(type: 'income' | 'expense') {
    this.currentTransactionType = type;
    this.formMode = 'add';
    this.editingId = null;
    this.isFormOpen = true;
    this.initForm();
  }

  openEditForm(entry: any, type: 'income' | 'expense') {
    this.currentTransactionType = type;
    this.formMode = 'edit';
    this.editingId = entry.id;
    this.isFormOpen = true;
    
    // Parse date to YYYY-MM-DD
    const formattedDate = new Date(entry.date).toISOString().split('T')[0];

    this.trackerForm.patchValue({
      amount: entry.amount,
      category: entry.category,
      description: entry.description || '',
      date: formattedDate
    });
  }

  closeForm() {
    this.isFormOpen = false;
    this.trackerForm.reset();
  }

  onSubmit() {
    if (this.trackerForm.invalid) return;

    const formVal = this.trackerForm.value;
    let category = formVal.category;

    if (category === 'CUSTOM_CATEGORY') {
      category = formVal.customCategory.trim();
      
      // Save it to dropdown arrays for future selections in current session
      if (this.currentTransactionType === 'income') {
        if (!this.incomeCategories.includes(category)) {
          const otherIndex = this.incomeCategories.indexOf('Other');
          if (otherIndex !== -1) {
            this.incomeCategories.splice(otherIndex, 0, category);
          } else {
            this.incomeCategories.push(category);
          }
        }
      } else {
        if (!this.expenseCategories.includes(category)) {
          const otherIndex = this.expenseCategories.indexOf('Other');
          if (otherIndex !== -1) {
            this.expenseCategories.splice(otherIndex, 0, category);
          } else {
            this.expenseCategories.push(category);
          }
        }
      }
    }

    const transactionData = {
      amount: parseFloat(formVal.amount),
      category: category,
      description: formVal.description,
      date: formVal.date
    };

    if (this.formMode === 'add') {
      const apiCall = this.currentTransactionType === 'income'
        ? this.api.addIncome(transactionData)
        : this.api.addExpense(transactionData);

      apiCall.subscribe({
        next: () => {
          this.snackBar.open(`${this.currentTransactionType === 'income' ? 'Income' : 'Expense'} added successfully`, 'Dismiss', { duration: 3000 });
          this.closeForm();
          this.loadData();
        },
        error: (err) => this.showError(err)
      });
    } else {
      if (this.editingId === null) return;
      const apiCall = this.currentTransactionType === 'income'
        ? this.api.updateIncome(this.editingId, transactionData)
        : this.api.updateExpense(this.editingId, transactionData);

      apiCall.subscribe({
        next: () => {
          this.snackBar.open(`${this.currentTransactionType === 'income' ? 'Income' : 'Expense'} updated successfully`, 'Dismiss', { duration: 3000 });
          this.closeForm();
          this.loadData();
        },
        error: (err) => this.showError(err)
      });
    }
  }

  deleteEntry(id: number, type: 'income' | 'expense') {
    if (confirm('Are you sure you want to delete this entry?')) {
      const apiCall = type === 'income' ? this.api.deleteIncome(id) : this.api.deleteExpense(id);
      apiCall.subscribe({
        next: () => {
          this.snackBar.open('Entry deleted successfully', 'Dismiss', { duration: 3000 });
          this.loadData();
        },
        error: (err) => this.showError(err)
      });
    }
  }

  showError(err: any) {
    const msg = err.error?.message || 'Error occurred while saving transaction';
    this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
  }

  renderCharts() {
    if (!this.expenseChartCanvas || !this.compareChartCanvas) return;

    // Destroy existing charts
    if (this.expenseChart) this.expenseChart.destroy();
    if (this.compareChart) this.compareChart.destroy();

    // 1. Calculate Expense Breakdown by Category
    const categoryTotals: { [key: string]: number } = {};
    this.expenseCategories.forEach(cat => categoryTotals[cat] = 0);
    this.expensesList.forEach(e => {
      const cat = e.category || 'Other';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + parseFloat(e.amount);
    });

    const activeCategories = Object.keys(categoryTotals).filter(cat => categoryTotals[cat] > 0);
    const categoryValues = activeCategories.map(cat => categoryTotals[cat]);

    // Setup responsive colors list that supports custom categories gracefully
    const presetColors = [
      'rgba(244, 63, 94, 0.8)',   // Food (rose)
      'rgba(245, 158, 11, 0.8)',  // Travel (amber)
      'rgba(99, 102, 241, 0.8)',  // Bills (indigo)
      'rgba(6, 182, 212, 0.8)',   // Shopping (cyan)
      'rgba(139, 92, 246, 0.8)',  // Rent (purple)
      'rgba(236, 72, 153, 0.8)',  // Entertainment (pink)
      'rgba(16, 185, 129, 0.8)',  // Health (emerald)
      'rgba(20, 184, 166, 0.8)',  // Teal
      'rgba(249, 115, 22, 0.8)',  // Orange
      'rgba(234, 179, 8, 0.8)',   // Yellow
      'rgba(148, 163, 184, 0.8)'  // Other (slate)
    ];
    const chartColors = activeCategories.map((_, index) => presetColors[index % presetColors.length]);

    // Render Doughnut Chart (Expenses breakdown)
    const ctxExpense = this.expenseChartCanvas.nativeElement.getContext('2d');
    this.expenseChart = new Chart(ctxExpense, {
      type: 'doughnut',
      data: {
        labels: activeCategories,
        datasets: [{
          data: categoryValues,
          backgroundColor: chartColors,
          borderWidth: 1.5,
          borderColor: 'rgba(12, 12, 26, 0.8)'
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
            labels: { 
              color: '#94a3b8', 
              font: { family: 'Outfit', size: 12, weight: 500 } 
            }
          }
        }
      }
    });

    // 2. Render Bar Chart comparing Total Income vs Total Expenses
    const totalIncome = this.incomeList.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);
    const totalExpense = this.expensesList.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    const ctxCompare = this.compareChartCanvas.nativeElement.getContext('2d');
    
    // Create gradient for Income (green)
    const gradIncome = ctxCompare.createLinearGradient(0, 0, 0, 200);
    gradIncome.addColorStop(0, 'rgba(16, 185, 129, 0.85)');
    gradIncome.addColorStop(1, 'rgba(16, 185, 129, 0.15)');

    // Create gradient for Expenses (red/rose)
    const gradExpense = ctxCompare.createLinearGradient(0, 0, 0, 200);
    gradExpense.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
    gradExpense.addColorStop(1, 'rgba(244, 63, 94, 0.15)');

    this.compareChart = new Chart(ctxCompare, {
      type: 'bar',
      data: {
        labels: ['Income', 'Expenses'],
        datasets: [{
          label: 'Transaction Total (₹)',
          data: [totalIncome, totalExpense],
          backgroundColor: [gradIncome, gradExpense],
          borderRadius: 8,
          borderWidth: 1.5,
          borderColor: [
            'rgba(16, 185, 129, 0.9)',
            'rgba(244, 63, 94, 0.9)'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } },
            grid: { display: false }
          }
        }
      }
    });
  }
}
