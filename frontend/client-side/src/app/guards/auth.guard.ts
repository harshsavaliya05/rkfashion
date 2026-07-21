import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);

  const path = route.routeConfig?.path || '';
  const actionName = path === 'cart' ? 'view your shopping cart' : 'view your wishlist';

  if (authService.isLoggedIn()) {
    return true;
  }

  // Guest Account: Trigger warning and redirect to registration page
  authService.checkAuthAndTriggerModal(actionName);

  return false;
};
