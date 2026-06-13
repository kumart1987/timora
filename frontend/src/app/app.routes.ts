import { Routes } from '@angular/router';
import { Auth } from './components/auth/auth';
import { Dashboard } from './components/dashboard/dashboard';
import { Tracker } from './components/tracker/tracker';
import { Shopping } from './components/shopping/shopping';
import { Investments } from './components/investments/investments';
import { Health } from './components/health/health';
import { Trips } from './components/trips/trips';
import { authGuard } from './guards/auth.guard';
import { noAuthGuard } from './guards/no-auth.guard';

export const routes: Routes = [
  { path: 'auth', component: Auth, canActivate: [noAuthGuard] },
  { path: 'dashboard', component: Dashboard, canActivate: [authGuard] },
  { path: 'tracker', component: Tracker, canActivate: [authGuard] },
  { path: 'shopping', component: Shopping, canActivate: [authGuard] },
  { path: 'investments', component: Investments, canActivate: [authGuard] },
  { path: 'health', component: Health, canActivate: [authGuard] },
  { path: 'trips', component: Trips, canActivate: [authGuard] },
  { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
  { path: '**', redirectTo: '/dashboard' }
];
