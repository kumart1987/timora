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
  displayedColumns = ['date', 'category', 'description', 'amount', 'actions'];

  // Form State
  trackerForm!: FormGroup;
  isFormOpen = false;
  formMode: 'add' | 'edit' = 'add';
  currentTransactionType: 'income' | 'expense' = 'expense';
  editingId: number | null = null;

  // Categories
  incomeCategories = ['Salary', 'Freelance', 'Investments', 'Refunds', 'Gifts', 'Other'];
  expenseCategories = ['Food', 'Travel', 'Bills', 'Shopping', 'Rent', 'Entertainment', 'Health', 'Other'];

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
      description: [''],
      date: [today, Validators.required]
    });
  }

  loadData() {
    this.api.getIncome().subscribe({
      next: (income) => {
        this.incomeList = income;
        this.api.getExpenses().subscribe({
          next: (expenses) => {
            this.expensesList = expenses;
            setTimeout(() => this.renderCharts(), 100);
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
    const transactionData = {
      amount: parseFloat(formVal.amount),
      category: formVal.category,
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

    // Render Doughnut Chart (Expenses breakdown)
    const ctxExpense = this.expenseChartCanvas.nativeElement.getContext('2d');
    this.expenseChart = new Chart(ctxExpense, {
      type: 'doughnut',
      data: {
        labels: activeCategories,
        datasets: [{
          data: categoryValues,
          backgroundColor: [
            'rgba(244, 63, 94, 0.8)',   // Food (rose)
            'rgba(245, 158, 11, 0.8)',  // Travel (amber)
            'rgba(99, 102, 241, 0.8)',  // Bills (indigo)
            'rgba(6, 182, 212, 0.8)',   // Shopping (cyan)
            'rgba(139, 92, 246, 0.8)',  // Rent (purple)
            'rgba(236, 72, 153, 0.8)',  // Entertainment (pink)
            'rgba(16, 185, 129, 0.8)',  // Health (emerald)
            'rgba(148, 163, 184, 0.8)'  // Other (slate)
          ],
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
