import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from './auth';

export const signedInGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return (await auth.isSignedIn()) || router.createUrlTree(['/login']);
};

export const signedOutGuard: CanActivateFn = async () => {
  const auth = inject(Auth);
  const router = inject(Router);
  return !(await auth.isSignedIn()) || router.createUrlTree(['/']);
};
