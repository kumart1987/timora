import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Chart } from 'chart.js/auto';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-investments',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './investments.html',
  styleUrl: './investments.scss'
})
export class Investments implements OnInit {
  investmentsList: any[] = [];
  displayedColumns = ['type', 'name', 'symbol', 'units', 'purchase_price', 'current_price', 'total_value', 'gain_loss', 'actions'];

  // Portfolio Totals
  totalCost = 0;
  totalValue = 0;
  netGain = 0;
  gainPercent = 0;

  // Form states
  investmentForm!: FormGroup;
  isFormOpen = false;
  editingId: number | null = null;
  updatingPriceId: number | null = null;
  newPriceInput = 0;

  // Chart
  @ViewChild('portfolioChartCanvas') portfolioChartCanvas!: ElementRef;
  portfolioChart: any = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadInvestments();
  }

  initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.investmentForm = this.fb.group({
      type: ['Mutual Fund', Validators.required],
      name: ['', Validators.required],
      symbol: [''],
      units: ['', [Validators.required, Validators.min(0.0001)]],
      purchase_price: ['', [Validators.required, Validators.min(0.01)]],
      current_price: [''],
      purchase_date: [today]
    });
  }

  loadInvestments() {
    this.api.getInvestments().subscribe({
      next: (data) => {
        this.investmentsList = data;
        this.calculateTotals();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => console.error('Error loading investments:', err)
    });
  }

  calculateTotals() {
    let cost = 0;
    let val = 0;
    this.investmentsList.forEach(inv => {
      const u = parseFloat(inv.units);
      cost += u * parseFloat(inv.purchase_price);
      val += u * parseFloat(inv.current_price);
    });

    this.totalCost = cost;
    this.totalValue = val;
    this.netGain = val - cost;
    this.gainPercent = cost > 0 ? (this.netGain / cost) * 100 : 0;
  }

  openAddForm() {
    this.initForm();
    this.isFormOpen = true;
  }

  closeForm() {
    this.isFormOpen = false;
    this.investmentForm.reset();
  }

  onSubmit() {
    if (this.investmentForm.invalid) return;

    const val = this.investmentForm.value;
    const body = {
      type: val.type,
      name: val.name,
      symbol: val.symbol || null,
      units: parseFloat(val.units),
      purchase_price: parseFloat(val.purchase_price),
      current_price: val.current_price ? parseFloat(val.current_price) : parseFloat(val.purchase_price),
      purchase_date: val.purchase_date
    };

    this.api.addInvestment(body).subscribe({
      next: () => {
        this.snackBar.open('Investment added successfully', 'Dismiss', { duration: 3000 });
        this.closeForm();
        this.loadInvestments();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error occurred while saving investment';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  startPriceUpdate(entry: any) {
    this.updatingPriceId = entry.id;
    this.newPriceInput = entry.current_price;
  }

  savePriceUpdate(id: number) {
    if (this.newPriceInput <= 0) {
      this.snackBar.open('Price must be greater than 0', 'Dismiss', { duration: 3000 });
      return;
    }

    this.api.updateInvestmentPrice(id, this.newPriceInput).subscribe({
      next: () => {
        this.updatingPriceId = null;
        this.snackBar.open('Asset price updated', 'Dismiss', { duration: 3000 });
        this.loadInvestments();
      },
      error: (err) => {
        console.error(err);
        this.snackBar.open('Error updating price', 'Dismiss', { duration: 5000 });
      }
    });
  }

  cancelPriceUpdate() {
    this.updatingPriceId = null;
  }

  deleteInvestment(id: number) {
    if (confirm('Are you sure you want to delete this asset from your portfolio?')) {
      this.api.deleteInvestment(id).subscribe({
        next: () => {
          this.snackBar.open('Asset deleted from portfolio', 'Dismiss', { duration: 3000 });
          this.loadInvestments();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error deleting asset', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }

  renderCharts() {
    if (!this.portfolioChartCanvas) return;
    if (this.portfolioChart) this.portfolioChart.destroy();

    // Calculate allocation by Type
    let stockVal = 0;
    let mfVal = 0;
    this.investmentsList.forEach(inv => {
      const v = parseFloat(inv.units) * parseFloat(inv.current_price);
      if (inv.type === 'Stock') {
        stockVal += v;
      } else {
        mfVal += v;
      }
    });

    if (stockVal === 0 && mfVal === 0) return;

    const ctx = this.portfolioChartCanvas.nativeElement.getContext('2d');
    this.portfolioChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Stocks', 'Mutual Funds'],
        datasets: [{
          data: [stockVal, mfVal],
          backgroundColor: ['rgba(6, 182, 212, 0.8)', 'rgba(99, 102, 241, 0.8)'],
          borderWidth: 1.5,
          borderColor: 'rgba(12, 12, 26, 0.8)'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { 
              color: '#94a3b8', 
              font: { family: 'Outfit', size: 12, weight: 500 },
              padding: 15
            }
          }
        }
      }
    });
  }
}
