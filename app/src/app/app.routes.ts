import { Routes } from '@angular/router';
import { signedInGuard, signedOutGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [signedInGuard],
    loadComponent: () => import('./features/shopping-list/shopping-list').then((m) => m.ShoppingList),
  },
  {
    path: 'login',
    canActivate: [signedOutGuard],
    loadComponent: () => import('./features/auth/login').then((m) => m.Login),
  },
  { path: '**', redirectTo: '' },
];
