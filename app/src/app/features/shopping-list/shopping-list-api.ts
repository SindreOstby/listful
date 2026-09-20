import { inject, Service } from '@angular/core';
import { Supabase } from '../../core/supabase';
import { Tables, TablesInsert } from '../../core/database.types';

export type ShoppingList = Tables<'shopping_lists'>;
export type ShoppingListItem = Tables<'shopping_list_items'>;
export type NewShoppingListItem = Pick<TablesInsert<'shopping_list_items'>, 'name' | 'quantity' | 'unit'>;

const DEFAULT_LIST_NAME = 'My shopping list';

/** Data access for shopping lists and their items. Row access is enforced by RLS. */
@Service()
export class ShoppingListApi {
  private readonly supabase = inject(Supabase).client;

  async getOrCreateDefaultList(): Promise<ShoppingList> {
    const { data: existing, error } = await this.supabase
      .from('shopping_lists')
      .select()
      .order('created_at')
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (existing) return existing;

    const { data: created, error: insertError } = await this.supabase
      .from('shopping_lists')
      .insert({ name: DEFAULT_LIST_NAME })
      .select()
      .single();
    if (insertError) throw insertError;
    return created;
  }

  async listItems(listId: string): Promise<ShoppingListItem[]> {
    const { data, error } = await this.supabase
      .from('shopping_list_items')
      .select()
      .eq('list_id', listId)
      .order('created_at');
    if (error) throw error;
    return data;
  }

  async addItem(listId: string, item: NewShoppingListItem): Promise<ShoppingListItem> {
    const { data, error } = await this.supabase
      .from('shopping_list_items')
      .insert({ ...item, list_id: listId })
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteItem(id: string): Promise<void> {
    const { error } = await this.supabase.from('shopping_list_items').delete().eq('id', id);
    if (error) throw error;
  }

  /**
   * Takes the new value rather than toggling, so two taps landing out of order can't lose an update.
   *
   * `.select().single()` is deliberate: an update matching no row — deleted on another device, or
   * blocked by RLS — otherwise succeeds with no error, and the optimistic UI would keep a state the
   * server never accepted. Asking for the row back turns that silent no-op into an error.
   */
  async setItemChecked(id: string, isChecked: boolean): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_list_items')
      .update({ is_checked: isChecked })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
  }

  /** Filters server-side: a `.in('id', ids)` list of UUIDs would be kilobytes of query string. */
  async deleteCheckedItems(listId: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_list_items')
      .delete()
      .eq('list_id', listId)
      .eq('is_checked', true);
    if (error) throw error;
  }
}
