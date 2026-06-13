import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';

// Angular Material Imports
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  title = 'TIMORA';
  currentUser: any = null;
  todayDate = new Date();
  isDarkMode = true;

  constructor(public api: ApiService, private router: Router) {}

  ngOnInit() {
    this.api.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    const savedTheme = localStorage.getItem('timora_theme');
    this.isDarkMode = savedTheme !== 'light';
    const body = document.body;
    body.classList.add(this.isDarkMode ? 'dark-theme' : 'light-theme');
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    const body = document.body;
    if (this.isDarkMode) {
      body.classList.add('dark-theme');
      body.classList.remove('light-theme');
    } else {
      body.classList.add('light-theme');
      body.classList.remove('dark-theme');
    }
    localStorage.setItem('timora_theme', this.isDarkMode ? 'dark' : 'light');
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/auth']);
  }
}
