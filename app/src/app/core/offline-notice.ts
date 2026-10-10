import { Component, DestroyRef, DOCUMENT, inject, signal } from '@angular/core';

/** The app shell loads from the service worker offline, but Supabase does not, so say so. */
@Component({
  selector: 'app-offline-notice',
  // The live region stays in the DOM so screen readers announce the text when it appears.
  template: `
    <div role="status" class="mx-auto max-w-xl px-4">
      @if (offline()) {
        <p class="mt-4 rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink">
          You're offline. Your list can't load or save until you're back online.
        </p>
      }
    </div>
  `,
})
export class OfflineNotice {
  private readonly window = inject(DOCUMENT).defaultView;

  protected readonly offline = signal(this.window?.navigator.onLine === false);

  constructor() {
    const update = () => this.offline.set(this.window?.navigator.onLine === false);
    this.window?.addEventListener('online', update);
    this.window?.addEventListener('offline', update);
    inject(DestroyRef).onDestroy(() => {
      this.window?.removeEventListener('online', update);
      this.window?.removeEventListener('offline', update);
    });
  }
}
