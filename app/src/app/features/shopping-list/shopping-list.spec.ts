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

describe('ShoppingList', () => {
  let api: {
    getOrCreateDefaultList: ReturnType<typeof vi.fn>;
    listItems: ReturnType<typeof vi.fn>;
    addItem: ReturnType<typeof vi.fn>;
    deleteItem: ReturnType<typeof vi.fn>;
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

  beforeEach(() => {
    api = {
      getOrCreateDefaultList: vi.fn().mockResolvedValue(list),
      listItems: vi.fn().mockResolvedValue([item({})]),
      addItem: vi.fn(),
      deleteItem: vi.fn().mockResolvedValue(undefined),
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
    expect(el.textContent).toContain('Bread');
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
});
