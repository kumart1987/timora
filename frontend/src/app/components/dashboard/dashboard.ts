import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

// Angular Material Imports
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatProgressBarModule
  ],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  stats: any = null;
  isLoading = true;
  savingPercent = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadStats();
  }

  loadStats() {
    this.isLoading = true;
    this.api.getStats().subscribe({
      next: (data) => {
        this.stats = data.summary;
        this.isLoading = false;
        
        // Calculate saving percentage if income exists
        if (this.stats.totalIncome > 0) {
          const savings = this.stats.totalIncome - this.stats.totalExpenses;
          this.savingPercent = Math.max(0, Math.min(100, Math.round((savings / this.stats.totalIncome) * 100)));
        } else {
          this.savingPercent = 0;
        }
      },
      error: (err) => {
        console.error('Error loading dashboard stats:', err);
        this.isLoading = false;
        // Mock fallback statistics if database or API is offline
        this.stats = {
          totalIncome: 12000,
          totalExpenses: 4800,
          netBalance: 7200,
          investmentValue: 18500,
          investmentGain: 2400,
          currentWeight: 78.4,
          goalWeight: 75.0,
          upcomingTrips: 2
        };
        this.savingPercent = 60;
      }
    });
  }
}
