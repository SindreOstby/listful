import { afterNextRender, Component, computed, ElementRef, inject, Injector, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, FormRoot, maxLength, min, required } from '@angular/forms/signals';
import { Auth } from '../../core/auth';
import { ShoppingList as List, ShoppingListApi, ShoppingListItem } from './shopping-list-api';
import { ShoppingListItemRow } from './shopping-list-item-row';

const EMPTY_ITEM = { name: '', quantity: 1, unit: '' };

@Component({
  selector: 'app-shopping-list',
  imports: [FormField, FormRoot, ShoppingListItemRow],
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

      <!--
        Rendered unconditionally: a live region created in the same tick as its content is often
        not announced. Ticking an item is deliberately silent here — the checkbox announces itself.
      -->
      <p role="status" class="sr-only">{{ status() }}</p>

      <section id="items" tabindex="-1" class="mt-8" aria-labelledby="items-heading">
        <h2 id="items-heading" class="sr-only">Items</h2>
        @if (loading()) {
          <p class="text-muted">Loading your list…</p>
        } @else {
          <ul
            aria-labelledby="items-heading"
            class="divide-y divide-line rounded-lg border border-line bg-surface"
          >
            @for (item of remaining(); track item.id) {
              <li
                app-shopping-list-item-row
                [item]="item"
                (checkedChange)="toggleItem(item, $event)"
                (deleted)="deleteItem(item)"
              ></li>
            } @empty {
              <li class="px-4 py-6 text-center text-muted">
                @if (checked().length) {
                  Nothing left to get.
                } @else {
                  Your list is empty. Add something you need.
                }
              </li>
            }
          </ul>

          @if (checked().length) {
            <div class="mt-6 flex items-center justify-between gap-4">
              <h3 id="checked-heading" class="text-lg font-semibold text-ink">Got it ({{ checked().length }})</h3>
              <button
                type="button"
                (click)="clearChecked()"
                class="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
              >
                Clear checked
              </button>
            </div>
            <ul
              aria-labelledby="checked-heading"
              class="mt-3 divide-y divide-line rounded-lg border border-line bg-surface"
            >
              @for (item of checked(); track item.id) {
                <li
                  app-shopping-list-item-row
                  [item]="item"
                  (checkedChange)="toggleItem(item, $event)"
                  (deleted)="deleteItem(item)"
                ></li>
              }
            </ul>
          }
        }
      </section>
    </main>
  `,
})
export class ShoppingList {
  private readonly api = inject(ShoppingListApi);
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  protected readonly list = signal<List | null>(null);
  protected readonly items = signal<ShoppingListItem[]>([]);
  protected readonly loading = signal(true);
  protected readonly error = signal('');
  protected readonly status = signal('');

  // `items` stays in creation order, so filtering preserves that order within each group for free.
  // Grouping here rather than in the query also lets a tick regroup instantly, with no refetch.
  protected readonly remaining = computed(() => this.items().filter((item) => !item.is_checked));
  protected readonly checked = computed(() => this.items().filter((item) => item.is_checked));

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
      this.status.set(`${item.name} removed.`);
    });
  }

  /**
   * Optimistic, unlike the other mutations. A native checkbox flips its own DOM state on click
   * whatever Angular does, so awaiting the round trip first would leave the row visibly
   * half-toggled — ticked, but unmoved and still modelled as unchecked — until the server replies.
   */
  protected async toggleItem(item: ShoppingListItem, isChecked: boolean): Promise<void> {
    this.setChecked(item.id, isChecked);
    this.settleCheckbox(item.id, isChecked);
    await this.attempt(async () => {
      try {
        await this.api.setItemChecked(item.id, isChecked);
      } catch (error) {
        this.setChecked(item.id, !isChecked, isChecked);
        this.settleCheckbox(item.id, !isChecked);
        throw error;
      }
    });
  }

  protected async clearChecked(): Promise<void> {
    const list = this.list();
    const count = this.checked().length;
    if (!list || count === 0) return;
    await this.attempt(async () => {
      await this.api.deleteCheckedItems(list.id);
      this.items.update((items) => items.filter((item) => !item.is_checked));
      this.status.set(`Cleared ${count} checked ${count === 1 ? 'item' : 'items'}.`);
      this.focusAfterRender('#items');
    });
  }

  /** `expected` guards a rollback: leave the item alone if a newer tick already changed it. */
  private setChecked(id: string, isChecked: boolean, expected?: boolean): void {
    this.items.update((items) =>
      items.map((item) =>
        item.id === id && (expected === undefined || item.is_checked === expected)
          ? { ...item, is_checked: isChecked }
          : item,
      ),
    );
  }

  /**
   * Puts the checkbox back in agreement with the model, and keeps focus on it.
   *
   * Both halves are needed. The browser sets `checked` itself on click, so if a flip and its
   * rollback both land before a render, the binding sees no net change and never corrects the DOM —
   * leaving a box ticked for something that was never saved. And ticking an item moves its row to
   * the other list, detaching the focused element and dropping focus to the body.
   */
  private settleCheckbox(id: string, isChecked: boolean): void {
    afterNextRender(
      () => {
        const box = this.host.nativeElement.querySelector<HTMLInputElement>(`#check-${id}`);
        if (!box) return;
        box.checked = isChecked;
        box.focus();
      },
      { injector: this.injector },
    );
  }

  /** Moves focus to the items region when the element that had it is about to disappear. */
  private focusAfterRender(selector: string): void {
    afterNextRender(() => this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus(), {
      injector: this.injector,
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
      this.status.set(`${item.name} added.`);
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
