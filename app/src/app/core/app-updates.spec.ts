import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SwUpdate, UnrecoverableStateEvent, VersionEvent } from '@angular/service-worker';
import { Subject } from 'rxjs';
import type { Mock } from 'vitest';
import { AppUpdates } from './app-updates';

describe('AppUpdates', () => {
  let versionUpdates: Subject<VersionEvent>;
  let unrecoverable: Subject<UnrecoverableStateEvent>;
  let checkForUpdate: Mock<() => Promise<boolean>>;
  let reload: Mock<() => void>;
  let visibility: DocumentVisibilityState;
  let doc: EventTarget & {
    readonly visibilityState: DocumentVisibilityState;
    location: { reload: () => void };
  };

  function setup(isEnabled = true): void {
    versionUpdates = new Subject();
    unrecoverable = new Subject();
    checkForUpdate = vi.fn(() => Promise.resolve(false));
    reload = vi.fn<() => void>();
    visibility = 'visible';
    // defineProperties, not Object.assign, so the getter stays live instead of being copied once.
    doc = Object.defineProperties(new EventTarget(), {
      visibilityState: { get: () => visibility },
      location: { value: { reload } },
    }) as typeof doc;

    TestBed.configureTestingModule({
      providers: [
        { provide: SwUpdate, useValue: { isEnabled, versionUpdates, unrecoverable, checkForUpdate } },
        { provide: DOCUMENT, useValue: doc },
      ],
    });
    TestBed.inject(AppUpdates);
  }

  function setVisibility(state: DocumentVisibilityState): void {
    visibility = state;
    doc.dispatchEvent(new Event('visibilitychange'));
  }

  const versionReady = {
    type: 'VERSION_READY',
    currentVersion: { hash: 'old' },
    latestVersion: { hash: 'new' },
  } as const;

  it('waits until the app is hidden before reloading onto a new version', () => {
    setup();
    versionUpdates.next(versionReady);
    expect(reload).not.toHaveBeenCalled();

    setVisibility('hidden');
    expect(reload).toHaveBeenCalledTimes(1);

    setVisibility('visible');
    setVisibility('hidden');
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads right away when a new version is ready while hidden', () => {
    setup();
    visibility = 'hidden';
    versionUpdates.next(versionReady);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ignores version events other than VERSION_READY', () => {
    setup();
    versionUpdates.next({ type: 'VERSION_DETECTED', version: { hash: 'new' } });
    setVisibility('hidden');
    expect(reload).not.toHaveBeenCalled();
  });

  it('reloads immediately when the cached version is unrecoverable', () => {
    setup();
    unrecoverable.next({ type: 'UNRECOVERABLE_STATE', reason: 'gone' });
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('checks for an update when the app comes back into view', () => {
    setup();
    setVisibility('hidden');
    expect(checkForUpdate).not.toHaveBeenCalled();
    setVisibility('visible');
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it('does nothing when the service worker is disabled', () => {
    setup(false);
    versionUpdates.next(versionReady);
    setVisibility('hidden');
    setVisibility('visible');
    expect(reload).not.toHaveBeenCalled();
    expect(checkForUpdate).not.toHaveBeenCalled();
  });
});
