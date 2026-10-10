import { DOCUMENT, inject, Service } from '@angular/core';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';

/**
 * Moves open clients onto a newly deployed version. Without this, the service worker keeps serving
 * the old bundle until every tab is closed, which for an installed PWA can be days, while the
 * database has already been migrated for the new one.
 */
@Service()
export class AppUpdates {
  private readonly swUpdate = inject(SwUpdate);
  private readonly document = inject(DOCUMENT);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    // Reload while the app is out of sight, so an item being typed is never thrown away.
    this.swUpdate.versionUpdates
      .pipe(filter((event) => event.type === 'VERSION_READY'))
      .subscribe(() => this.reloadWhenHidden());

    // The cached version is broken (its files are gone from the server), so it cannot keep running.
    this.swUpdate.unrecoverable.subscribe(() => this.document.location.reload());

    // The service worker only checks on navigation, which an installed PWA rarely does.
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible') {
        this.swUpdate.checkForUpdate().catch(() => undefined);
      }
    });
  }

  private reloadWhenHidden(): void {
    if (this.document.visibilityState === 'hidden') {
      this.document.location.reload();
      return;
    }
    const onChange = () => {
      if (this.document.visibilityState !== 'hidden') return;
      this.document.removeEventListener('visibilitychange', onChange);
      this.document.location.reload();
    };
    this.document.addEventListener('visibilitychange', onChange);
  }
}
