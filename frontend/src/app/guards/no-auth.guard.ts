import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { ApiService } from '../services/api.service';

export const noAuthGuard: CanActivateFn = () => {
  const router = inject(Router);
  const api = inject(ApiService);
  if (!api.isLoggedIn()) {
    return true;
  }
  router.navigate(['/dashboard']);
  return false;
};
