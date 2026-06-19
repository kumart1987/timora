import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ApiService } from './services/api.service';
import { BreakpointObserver } from '@angular/cdk/layout';
import { fromEvent, merge, Subscription, timer } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

// Angular Material Imports
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  title = 'TIMORA';
  currentUser: any = null;
  todayDate = new Date();
  isDarkMode = true;
  isMobile = false;
  private inactivitySub?: Subscription;

  constructor(
    public api: ApiService, 
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.api.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.setupInactivityTimer();
      } else {
        this.destroyInactivityTimer();
      }
    });

    this.breakpointObserver.observe('(max-width: 959px)').subscribe(result => {
      this.isMobile = result.matches;
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

  onNavItemClick(drawer: any) {
    if (this.isMobile) {
      drawer.close();
    }
  }

  logout() {
    this.api.logout();
    this.router.navigate(['/auth']);
  }

  ngOnDestroy() {
    this.destroyInactivityTimer();
  }

  setupInactivityTimer() {
    this.destroyInactivityTimer();
    
    const eventStreams = [
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'mousedown'),
      fromEvent(document, 'keypress'),
      fromEvent(document, 'touchstart'),
      fromEvent(document, 'scroll')
    ];

    this.inactivitySub = merge(...eventStreams)
      .pipe(
        startWith(null),
        switchMap(() => timer(60000)) // 1 minute inactivity timeout
      )
      .subscribe(() => {
        this.handleInactivityLogout();
      });
  }

  destroyInactivityTimer() {
    if (this.inactivitySub) {
      this.inactivitySub.unsubscribe();
      this.inactivitySub = undefined;
    }
  }

  handleInactivityLogout() {
    this.destroyInactivityTimer();
    this.logout();
    this.snackBar.open('Logged out due to 1 minute of inactivity', 'Dismiss', { duration: 5000 });
  }
}
