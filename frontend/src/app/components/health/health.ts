import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ApiService } from '../../services/api.service';
import { Chart } from 'chart.js/auto';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-health',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatTableModule
  ],
  templateUrl: './health.html',
  styleUrl: './health.scss'
})
export class Health implements OnInit {
  weightLogs: any[] = [];
  displayedColumns = ['date', 'weight', 'note', 'actions'];

  // Goal and Progress Metrics
  currentWeight: number | null = null;
  targetWeight: number | null = null;
  weightDifference = 0;
  progressMessage = '';

  // Form State
  healthForm!: FormGroup;
  isFormOpen = false;

  // Chart
  @ViewChild('weightChartCanvas') weightChartCanvas!: ElementRef;
  weightChart: any = null;

  constructor(
    private fb: FormBuilder,
    private api: ApiService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.initForm();
    this.loadWeightLogs();
  }

  initForm() {
    const today = new Date().toISOString().split('T')[0];
    this.healthForm = this.fb.group({
      weight: ['', [Validators.required, Validators.min(1), Validators.max(500)]],
      date: [today, Validators.required],
      goal_weight: [''],
      note: ['']
    });
  }

  loadWeightLogs() {
    this.api.getWeightLogs().subscribe({
      next: (data) => {
        this.weightLogs = data;
        this.processWeightMetrics();
        setTimeout(() => this.renderCharts(), 100);
      },
      error: (err) => console.error('Error loading weight logs:', err)
    });
  }

  processWeightMetrics() {
    if (this.weightLogs.length === 0) {
      this.currentWeight = null;
      this.targetWeight = null;
      this.weightDifference = 0;
      this.progressMessage = 'Start logging your weight to track your health goals.';
      return;
    }

    // Latest weight log (sorted by date ascending in database, so last element is latest)
    const latestLog = this.weightLogs[this.weightLogs.length - 1];
    this.currentWeight = parseFloat(latestLog.weight);
    
    // Find the latest set goal weight
    for (let i = this.weightLogs.length - 1; i >= 0; i--) {
      if (this.weightLogs[i].goal_weight) {
        this.targetWeight = parseFloat(this.weightLogs[i].goal_weight);
        break;
      }
    }

    if (this.currentWeight && this.targetWeight) {
      this.weightDifference = Math.abs(this.currentWeight - this.targetWeight);
      if (this.currentWeight > this.targetWeight) {
        this.progressMessage = `Keep it up! You are ${this.weightDifference.toFixed(1)} kg away from your target goal.`;
      } else if (this.currentWeight < this.targetWeight) {
        this.progressMessage = `You are ${this.weightDifference.toFixed(1)} kg below your target weight.`;
      } else {
        this.progressMessage = '🎉 Congratulations! You have reached your target weight!';
      }
    } else {
      this.targetWeight = null;
      this.weightDifference = 0;
      this.progressMessage = 'Target weight is not set. Enter a goal weight to track your target.';
    }
  }

  openAddForm() {
    this.initForm();
    // Pre-populate goal weight if it was set previously
    if (this.targetWeight) {
      this.healthForm.patchValue({ goal_weight: this.targetWeight });
    }
    this.isFormOpen = true;
  }

  closeForm() {
    this.isFormOpen = false;
    this.healthForm.reset();
  }

  onSubmit() {
    if (this.healthForm.invalid) return;

    const val = this.healthForm.value;
    const body = {
      weight: parseFloat(val.weight),
      date: val.date,
      goal_weight: val.goal_weight ? parseFloat(val.goal_weight) : null,
      note: val.note || null
    };

    this.api.addWeightLog(body).subscribe({
      next: () => {
        this.snackBar.open('Weight logged successfully', 'Dismiss', { duration: 3000 });
        this.closeForm();
        this.loadWeightLogs();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error occurred while saving weight log';
        this.snackBar.open(msg, 'Dismiss', { duration: 5000 });
      }
    });
  }

  deleteLog(id: number) {
    if (confirm('Are you sure you want to delete this log entry?')) {
      this.api.deleteWeightLog(id).subscribe({
        next: () => {
          this.snackBar.open('Entry deleted', 'Dismiss', { duration: 3000 });
          this.loadWeightLogs();
        },
        error: (err) => {
          console.error(err);
          this.snackBar.open('Error deleting entry', 'Dismiss', { duration: 5000 });
        }
      });
    }
  }

  renderCharts() {
    if (!this.weightChartCanvas || this.weightLogs.length === 0) return;
    if (this.weightChart) this.weightChart.destroy();

    const dates = this.weightLogs.map(log => new Date(log.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }));
    const weights = this.weightLogs.map(log => parseFloat(log.weight));

    const ctx = this.weightChartCanvas.nativeElement.getContext('2d');
    
    // Custom gradient for line chart fill
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
    gradient.addColorStop(1, 'rgba(6, 182, 212, 0.01)');

    const datasets: any[] = [{
      label: 'Weight (kg)',
      data: weights,
      borderColor: 'rgba(6, 182, 212, 1)',
      borderWidth: 2.5,
      fill: true,
      backgroundColor: gradient,
      tension: 0.35,
      pointBackgroundColor: 'rgba(6, 182, 212, 1)',
      pointBorderColor: '#fff',
      pointHoverRadius: 6,
      pointRadius: 4
    }];

    // If target weight goal exists, add a target line
    if (this.targetWeight) {
      const targetLine = Array(this.weightLogs.length).fill(this.targetWeight);
      datasets.push({
        label: 'Goal Target (kg)',
        data: targetLine,
        borderColor: 'rgba(244, 63, 94, 0.85)',
        borderWidth: 1.5,
        borderDash: [6, 6],
        fill: false,
        pointStyle: 'none',
        pointRadius: 0
      });
    }

    this.weightChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dates,
        datasets: datasets
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12, weight: 500 } }
          }
        },
        scales: {
          y: {
            ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          x: {
            ticks: { color: '#94a3b8', font: { family: 'Outfit', size: 11 } },
            grid: { display: false }
          }
        }
      }
    });
  }
}
