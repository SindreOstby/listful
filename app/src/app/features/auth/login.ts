import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { email, form, FormField, FormRoot, required, submit } from '@angular/forms/signals';
import { Auth } from '../../core/auth';

/** Matches `minimum_password_length` in supabase/config.toml. Enforced on sign-up only. */
const MINIMUM_NEW_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-login',
  imports: [FormField, FormRoot],
  template: `
    <main class="mx-auto max-w-sm px-4 py-12">
      <h1 class="text-3xl font-bold text-gray-900">Listful</h1>
      <p class="mt-1 text-gray-700">Buy what you need. Waste less.</p>

      <form [formRoot]="loginForm" class="mt-8 space-y-4" aria-label="Sign in">
        <div>
          <label for="email" class="block text-sm font-medium text-gray-900">Email</label>
          <input
            id="email"
            type="email"
            autocomplete="email"
            [formField]="loginForm.email"
            [attr.aria-describedby]="showErrors(loginForm.email().touched(), loginForm.email().invalid()) ? 'email-error' : null"
            class="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 focus:outline-2 focus:outline-blue-700"
          />
          @if (showErrors(loginForm.email().touched(), loginForm.email().invalid())) {
            <p id="email-error" class="mt-1 text-sm text-red-700">{{ loginForm.email().errors()[0].message }}</p>
          }
        </div>

        <div>
          <label for="password" class="block text-sm font-medium text-gray-900">Password</label>
          <input
            id="password"
            type="password"
            autocomplete="current-password"
            [formField]="loginForm.password"
            [attr.aria-describedby]="showErrors(loginForm.password().touched(), loginForm.password().invalid()) ? 'password-error' : null"
            class="mt-1 w-full rounded-md border border-gray-400 px-3 py-2 focus:outline-2 focus:outline-blue-700"
          />
          @if (showErrors(loginForm.password().touched(), loginForm.password().invalid())) {
            <p id="password-error" class="mt-1 text-sm text-red-700">{{ loginForm.password().errors()[0].message }}</p>
          }
        </div>

        @if (message(); as msg) {
          <p role="alert" class="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">{{ msg }}</p>
        }

        <div class="flex gap-3">
          <button
            type="submit"
            [disabled]="loginForm().submitting()"
            class="flex-1 rounded-md bg-blue-700 px-4 py-2 font-medium text-white hover:bg-blue-800 disabled:opacity-60"
          >
            Sign in
          </button>
          <button
            type="button"
            (click)="createAccount()"
            [disabled]="loginForm().submitting()"
            class="flex-1 rounded-md border border-blue-700 px-4 py-2 font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-60"
          >
            Create account
          </button>
        </div>
      </form>
    </main>
  `,
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly message = signal('');
  protected readonly credentials = signal({ email: '', password: '' });
  protected readonly loginForm = form(
    this.credentials,
    (path) => {
      required(path.email, { message: 'Enter your email' });
      email(path.email, { message: 'Enter a valid email address' });
      // No length rule here: it would lock out accounts created before the minimum was raised.
      // New passwords are checked in createAccount(), and by Supabase itself.
      required(path.password, { message: 'Enter your password' });
    },
    {
      submission: {
        action: async () => {
          await this.run(async ({ email, password }) => {
            await this.auth.signIn(email, password);
            await this.router.navigateByUrl('/');
          });
          return undefined;
        },
      },
    },
  );

  protected showErrors(touched: boolean, invalid: boolean): boolean {
    return touched && invalid;
  }

  protected createAccount(): void {
    const { password } = this.credentials();
    if (password.length > 0 && password.length < MINIMUM_NEW_PASSWORD_LENGTH) {
      this.message.set(`Password must be at least ${MINIMUM_NEW_PASSWORD_LENGTH} characters`);
      return;
    }
    void submit(this.loginForm, async () => {
      await this.run(async ({ email, password }) => {
        const signedIn = await this.auth.signUp(email, password);
        if (signedIn) {
          await this.router.navigateByUrl('/');
        } else {
          this.message.set('Check your email to confirm your account, then sign in.');
        }
      });
      return undefined;
    });
  }

  private async run(action: (value: { email: string; password: string }) => Promise<void>): Promise<void> {
    this.message.set('');
    try {
      await action(this.credentials());
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  }
}
