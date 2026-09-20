import { Component, input, output } from '@angular/core';
import { ShoppingListItem } from './shopping-list-api';

/**
 * One row of a shopping list.
 *
 * The selector is an attribute on `li` so the row *is* the list item. A wrapping element between
 * `ul` and `li` would break list semantics and stop `divide-y` matching the rows.
 */
@Component({
  selector: 'li[app-shopping-list-item-row]',
  host: { class: 'flex items-center justify-between gap-2 pr-2' },
  template: `
    <!-- The label, not the 20px box, is the tap target: 44px tall and the full width of the row. -->
    <label class="flex min-h-11 flex-1 items-center gap-3 py-3 pl-4">
      <input
        type="checkbox"
        [id]="'check-' + item().id"
        [checked]="item().is_checked"
        (change)="onToggle($event)"
        class="size-5 shrink-0 accent-accent"
      />
      <span
        [class.line-through]="item().is_checked"
        [class.text-muted]="item().is_checked"
        [class.text-ink]="!item().is_checked"
      >
        {{ item().name }}
        <span class="text-muted">
          <span aria-hidden="true">·</span> {{ item().quantity }}{{ item().unit ? ' ' + item().unit : '' }}
        </span>
      </span>
    </label>
    <button
      type="button"
      (click)="deleted.emit()"
      [attr.aria-label]="'Delete ' + item().name"
      class="rounded-lg px-3 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
    >
      Delete
    </button>
  `,
})
export class ShoppingListItemRow {
  readonly item = input.required<ShoppingListItem>();
  readonly checkedChange = output<boolean>();
  readonly deleted = output<void>();

  /** `change`, not `click`, so the keyboard Space key behaves identically. */
  protected onToggle(event: Event): void {
    this.checkedChange.emit((event.target as HTMLInputElement).checked);
  }
}
