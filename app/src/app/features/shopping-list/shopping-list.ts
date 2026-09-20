import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, FormRoot, maxLength, min, required } from '@angular/forms/signals';
import { Auth } from '../../core/auth';
import { ShoppingList as List, ShoppingListApi, ShoppingListItem } from './shopping-list-api';

const EMPTY_ITEM = { name: '', quantity: 1, unit: '' };

@Component({
  selector: 'app-shopping-list',
  imports: [FormField, FormRoot],
  template: `
    <main class="mx-auto max-w-xl px-4 py-8">
      <header class="flex items-center justify-between gap-4">
        <h1 class="text-2xl font-bold text-ink">{{ list()?.name ?? 'Shopping list' }}</h1>
        <button
          type="button"
          (click)="signOut()"
          class="rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-accent-soft"
        >
          Sign out
        </button>
      </header>

      @if (error(); as message) {
        <p role="alert" class="mt-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{{ message }}</p>
      }

      <form [formRoot]="itemForm" class="mt-6 flex flex-wrap items-end gap-3" aria-label="Add item">
        <div class="min-w-40 flex-1">
          <label for="item-name" class="block text-sm font-medium text-ink">Item</label>
          <input
            id="item-name"
            placeholder="Milk"
            [formField]="itemForm.name"
            class="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-muted"
          />
        </div>
        <div class="w-24">
          <label for="item-quantity" class="block text-sm font-medium text-ink">Quantity</label>
          <input
            id="item-quantity"
            type="number"
            step="any"
            [formField]="itemForm.quantity"
            class="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-muted"
          />
        </div>
        <div class="w-24">
          <label for="item-unit" class="block text-sm font-medium text-ink">Unit</label>
          <input
            id="item-unit"
            placeholder="L"
            [formField]="itemForm.unit"
            class="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-ink placeholder:text-muted"
          />
        </div>
        <button
          type="submit"
          [disabled]="!list() || itemForm().submitting()"
          class="rounded-lg bg-accent px-4 py-2.5 font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          Add
        </button>
      </form>
      @if (itemForm().touched() && itemForm().invalid()) {
        <ul class="mt-2 text-sm text-danger">
          @for (fieldError of itemForm().errorSummary(); track $index) {
            <li>{{ fieldError.message }}</li>
          }
        </ul>
      }

      <section class="mt-8" aria-labelledby="items-heading" aria-live="polite">
        <h2 id="items-heading" class="sr-only">Items</h2>
        @if (loading()) {
          <p class="text-muted">Loading your list…</p>
        } @else {
          <ul class="divide-y divide-line rounded-lg border border-line bg-surface">
            @for (item of items(); track item.id) {
              <li class="flex items-center justify-between gap-4 px-4 py-3">
                <span class="text-ink">
                  {{ item.name }}
                  <span class="text-muted">· {{ item.quantity }}{{ item.unit ? ' ' + item.unit : '' }}</span>
                </span>
                <button
                  type="button"
                  (click)="deleteItem(item)"
                  [attr.aria-label]="'Delete ' + item.name"
                  class="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                >
                  Delete
                </button>
              </li>
            } @empty {
              <li class="px-4 py-6 text-center text-muted">Your list is empty. Add something you need.</li>
            }
          </ul>
        }
      </section>
    </main>
  `,
})
export class ShoppingList {
  private readonly api = inject(ShoppingListApi);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly list = signal<List | null>(null);
  protected readonly items = signal<ShoppingListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');

  protected readonly newItem = signal({ ...EMPTY_ITEM });
  protected readonly itemForm = form(
    this.newItem,
    (path) => {
      required(path.name, { message: 'Enter an item name' });
      maxLength(path.name, 200, { message: 'Item name must be 200 characters or fewer' });
      min(path.quantity, 0.01, { message: 'Quantity must be greater than 0' });
      maxLength(path.unit, 20, { message: 'Unit must be 20 characters or fewer' });
    },
    {
      submission: {
        action: async () => {
          await this.addItem();
          return undefined;
        },
      },
    },
  );

  constructor() {
    void this.load();
  }

  protected async deleteItem(item: ShoppingListItem): Promise<void> {
    await this.attempt(async () => {
      await this.api.deleteItem(item.id);
      this.items.update((items) => items.filter((i) => i.id !== item.id));
    });
  }

  protected async signOut(): Promise<void> {
    await this.attempt(async () => {
      await this.auth.signOut();
      await this.router.navigateByUrl('/login');
    });
  }

  private async load(): Promise<void> {
    await this.attempt(async () => {
      const list = await this.api.getOrCreateDefaultList();
      this.list.set(list);
      this.items.set(await this.api.listItems(list.id));
    });
    this.loading.set(false);
  }

  private async addItem(): Promise<void> {
    const list = this.list();
    if (!list) return;
    const { name, quantity, unit } = this.newItem();
    await this.attempt(async () => {
      const item = await this.api.addItem(list.id, { name: name.trim(), quantity, unit: unit.trim() || null });
      this.items.update((items) => [...items, item]);
      this.itemForm().reset({ ...EMPTY_ITEM });
    });
  }

  private async attempt(action: () => Promise<void>): Promise<void> {
    this.error.set('');
    try {
      await action();
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Something went wrong. Try again.');
    }
  }
}
