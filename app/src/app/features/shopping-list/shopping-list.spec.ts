import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Auth } from '../../core/auth';
import { ShoppingList } from './shopping-list';
import { ShoppingListApi, ShoppingListItem } from './shopping-list-api';

const list = { id: 'list-1', name: 'My shopping list', owner_id: 'user-1', created_at: '2026-09-16T00:00:00Z' };

function item(overrides: Partial<ShoppingListItem>): ShoppingListItem {
  return {
    id: 'item-1',
    list_id: list.id,
    name: 'Milk',
    quantity: 2,
    unit: 'L',
    is_checked: false,
    created_at: '2026-09-16T00:00:00Z',
    ...overrides,
  };
}

/** The still-to-get list. */
function toGet(el: HTMLElement): HTMLElement | null {
  return el.querySelector('ul[aria-labelledby="items-heading"]');
}

/** The checked-off list. */
function gotIt(el: HTMLElement): HTMLElement | null {
  return el.querySelector('ul[aria-labelledby="checked-heading"]');
}

/** Clear checked carries no aria-label, so it can't be found the way Delete is. */
function buttonNamed(el: HTMLElement, text: string): HTMLButtonElement | undefined {
  return [...el.querySelectorAll('button')].find((button) => button.textContent?.trim() === text);
}

describe('ShoppingList', () => {
  let api: {
    getOrCreateDefaultList: ReturnType<typeof vi.fn>;
    listItems: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
    setItemChecked: ReturnType<typeof vi.fn>;
    deleteCheckedItems: ReturnType<typeof vi.fn>;
  };

  async function render() {
    TestBed.configureTestingModule({
      imports: [ShoppingList],
      providers: [
        provideRouter([]),
        { provide: ShoppingListApi, useValue: api },
        { provide: Auth, useValue: { signOut: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ShoppingList);
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, el: fixture.nativeElement as HTMLElement };
  }

  /** Ticks a checkbox the way a browser does: flip the DOM, then fire change. */
  async function toggle(fixture: { whenStable: () => Promise<unknown>; detectChanges: () => void }, box: HTMLInputElement, checked: boolean) {
    box.checked = checked;
    box.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(() => {
    api = {
      getOrCreateDefaultList: vi.fn().mockResolvedValue(list),
      listItems: vi.fn().mockResolvedValue([item({})]),
      addItem: vi.fn(),
      deleteItem: vi.fn().mockResolvedValue(undefined),
      setItemChecked: vi.fn().mockResolvedValue(undefined),
      deleteCheckedItems: vi.fn().mockResolvedValue(undefined),
    };
  });

  it('loads the default list and its items', async () => {
    const { el } = await render();
    expect(el.querySelector('h1')?.textContent).toContain('My shopping list');
    expect(el.textContent).toContain('Milk');
    expect(el.textContent).toContain('2 L');
  });

  it('adds an item', async () => {
    api.listItems.mockResolvedValue([]);
    api.addItem.mockResolvedValue(item({ id: 'item-2', name: 'Bread', quantity: 1, unit: null }));
    const { fixture, el } = await render();

    const name = el.querySelector<HTMLInputElement>('#item-name')!;
    name.value = 'Bread';
    name.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.addItem).toHaveBeenCalledWith('list-1', { name: 'Bread', quantity: 1, unit: null });
    expect(toGet(el)?.textContent).toContain('Bread');
    expect(name.value).toBe('');
  });

  it('does not add an item without a name', async () => {
    const { fixture, el } = await render();
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.addItem).not.toHaveBeenCalled();
    expect(el.textContent).toContain('Enter an item name');
  });

  it('deletes an item', async () => {
    const { fixture, el } = await render();
    el.querySelector<HTMLButtonElement>('button[aria-label="Delete Milk"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.deleteItem).toHaveBeenCalledWith('item-1');
    expect(el.textContent).toContain('Your list is empty');
  });

  it('shows an error when loading fails', async () => {
    api.getOrCreateDefaultList.mockRejectedValue(new Error('network down'));
    const { el } = await render();
    expect(el.querySelector('[role="alert"]')?.textContent).toContain('network down');
  });

  it('groups checked items under Got it', async () => {
    api.listItems.mockResolvedValue([
      item({ id: 'item-1', name: 'Milk', is_checked: true }),
      item({ id: 'item-2', name: 'Bread' }),
    ]);
    const { el } = await render();

    expect(toGet(el)?.textContent).toContain('Bread');
    expect(toGet(el)?.textContent).not.toContain('Milk');
    expect(gotIt(el)?.textContent).toContain('Milk');
    expect(el.querySelector('#checked-heading')?.textContent).toContain('Got it (1)');
  });

  it('checks an item off and sinks it into Got it', async () => {
    const { fixture, el } = await render();
    await toggle(fixture, el.querySelector<HTMLInputElement>('#check-item-1')!, true);

    expect(api.setItemChecked).toHaveBeenCalledWith('item-1', true);
    expect(gotIt(el)?.textContent).toContain('Milk');
    expect(toGet(el)?.textContent).toContain('Nothing left to get');
  });

  it('unchecks an item back into the list', async () => {
    api.listItems.mockResolvedValue([item({ is_checked: true })]);
    const { fixture, el } = await render();
    await toggle(fixture, el.querySelector<HTMLInputElement>('#check-item-1')!, false);

    expect(api.setItemChecked).toHaveBeenCalledWith('item-1', false);
    expect(el.querySelector('#checked-heading')).toBeNull();
    expect(toGet(el)?.textContent).toContain('Milk');
  });

  it('rolls the item back when saving the checkbox fails', async () => {
    api.setItemChecked.mockRejectedValue(new Error('offline'));
    const { fixture, el } = await render();
    await toggle(fixture, el.querySelector<HTMLInputElement>('#check-item-1')!, true);

    expect(el.querySelector('[role="alert"]')?.textContent).toContain('offline');
    expect(el.querySelector('#checked-heading')).toBeNull();
    expect(el.querySelector<HTMLInputElement>('#check-item-1')!.checked).toBe(false);
  });

  it('keeps focus on the checkbox after the item moves', async () => {
    const { fixture, el } = await render();
    const box = el.querySelector<HTMLInputElement>('#check-item-1')!;
    box.focus();
    await toggle(fixture, box, true);
    await fixture.whenStable();

    expect(document.activeElement).toBe(el.querySelector('#check-item-1'));
  });

  it('clears every checked item at once', async () => {
    api.listItems.mockResolvedValue([
      item({ id: 'item-1', name: 'Milk', is_checked: true }),
      item({ id: 'item-2', name: 'Bread', is_checked: true }),
      item({ id: 'item-3', name: 'Eggs' }),
    ]);
    const { fixture, el } = await render();
    buttonNamed(el, 'Clear checked')!.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(api.deleteCheckedItems).toHaveBeenCalledWith('list-1');
    expect(el.querySelector('#checked-heading')).toBeNull();
    expect(toGet(el)?.textContent).toContain('Eggs');
    expect(toGet(el)?.textContent).not.toContain('Milk');
    expect(toGet(el)?.textContent).not.toContain('Bread');
  });

  it('offers nothing to clear when no item is checked', async () => {
    const { el } = await render();
    expect(el.querySelector('#checked-heading')).toBeNull();
    expect(buttonNamed(el, 'Clear checked')).toBeUndefined();
    expect(api.deleteCheckedItems).not.toHaveBeenCalled();
  });

  it('adds a new item below the ones already checked off', async () => {
    api.listItems.mockResolvedValue([item({ id: 'item-1', name: 'Milk', is_checked: true })]);
    api.addItem.mockResolvedValue(item({ id: 'item-2', name: 'Bread', quantity: 1, unit: null }));
    const { fixture, el } = await render();

    const name = el.querySelector<HTMLInputElement>('#item-name')!;
    name.value = 'Bread';
    name.dispatchEvent(new Event('input'));
    el.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(toGet(el)?.textContent).toContain('Bread');
    expect(gotIt(el)?.textContent).toContain('Milk');
  });
});
