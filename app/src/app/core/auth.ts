import { computed, inject, Service, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { Supabase } from './supabase';

@Service()
export class Auth {
  private readonly supabase = inject(Supabase).client;
  private readonly sessionState = signal<Session | null>(null);
  private readonly initialized: Promise<void>;

  readonly session = this.sessionState.asReadonly();
  readonly user = computed(() => this.sessionState()?.user ?? null);

  constructor() {
    this.supabase.auth.onAuthStateChange((_event, session) => this.sessionState.set(session));
    this.initialized = this.supabase.auth
      .getSession()
      .then(({ data }) => this.sessionState.set(data.session));
  }

  /** Resolves once the stored session (if any) has been restored. */
  async isSignedIn(): Promise<boolean> {
    await this.initialized;
    return this.sessionState() !== null;
  }

  async signIn(email: string, password: string): Promise<void> {
    const { error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  /** Returns false when the project requires email confirmation before a session is issued. */
  async signUp(email: string, password: string): Promise<boolean> {
    const { data, error } = await this.supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data.session !== null;
  }

  async signOut(): Promise<void> {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}
