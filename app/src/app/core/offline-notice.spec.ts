import { TestBed } from '@angular/core/testing';
import { OfflineNotice } from './offline-notice';

describe('OfflineNotice', () => {
  let onLine: boolean;

  beforeEach(() => {
    onLine = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => onLine);
  });

  afterEach(() => vi.restoreAllMocks());

  async function render() {
    const fixture = TestBed.createComponent(OfflineNotice);
    await fixture.whenStable();
    return fixture;
  }

  function text(element: HTMLElement): string {
    return element.querySelector('[role="status"]')?.textContent?.trim() ?? '';
  }

  it('says nothing while online', async () => {
    const fixture = await render();
    expect(text(fixture.nativeElement)).toBe('');
  });

  it('shows the notice when starting offline', async () => {
    onLine = false;
    const fixture = await render();
    expect(text(fixture.nativeElement)).toContain("You're offline");
  });

  it('follows the connection as it drops and returns', async () => {
    const fixture = await render();

    onLine = false;
    window.dispatchEvent(new Event('offline'));
    await fixture.whenStable();
    expect(text(fixture.nativeElement)).toContain("You're offline");

    onLine = true;
    window.dispatchEvent(new Event('online'));
    await fixture.whenStable();
    expect(text(fixture.nativeElement)).toBe('');
  });
});
