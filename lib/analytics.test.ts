import { afterEach, describe, expect, it, vi } from 'vitest';

const posthog = vi.hoisted(() => ({
  init: vi.fn(), register: vi.fn(), identify: vi.fn(), capture: vi.fn(), reset: vi.fn(),
}));
vi.mock('posthog-js', () => ({ default: posthog }));

/** lib/analytics reads its key when the module loads, so each case loads it fresh. */
async function load(key?: string) {
  vi.resetModules();
  if (key) vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', key);
  return import('./analytics');
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
  document.cookie.split(';').forEach(part => {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; Max-Age=0; path=/`;
  });
});

describe('analytics', () => {
  it('does nothing at all without a key', async () => {
    const { initAnalytics, track } = await load();
    expect(await initAnalytics()).toBeNull();
    track('data_exported');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(posthog.init).not.toHaveBeenCalled();
    expect(posthog.capture).not.toHaveBeenCalled();
  });

  it('never autocaptures or records the screen (both would pick up card text)', async () => {
    const { initAnalytics } = await load('phc_test');
    await initAnalytics();
    const [key, options] = posthog.init.mock.calls[0];
    expect(key).toBe('phc_test');
    expect(options).toMatchObject({ api_host: '/ingest', autocapture: false, disable_session_recording: true });
  });

  it('knows a person by internal user id only, and tags the demo', async () => {
    document.cookie = 'pt_user=usr_abc; path=/';
    const { initAnalytics } = await load('phc_test');
    await initAnalytics();
    expect(posthog.identify).toHaveBeenCalledWith('usr_abc');
    expect(posthog.register).toHaveBeenCalledWith({ demo: false });
  });

  it('sends named events, and forgets the person on reset', async () => {
    const { resetAnalytics, track } = await load('phc_test');
    track('review_logged', { struggled: true, study_mode: 'flashcard', offline: false });
    await vi.waitFor(() => expect(posthog.capture).toHaveBeenCalledWith('review_logged', { struggled: true, study_mode: 'flashcard', offline: false }));
    await resetAnalytics();
    expect(posthog.reset).toHaveBeenCalled();
  });
});
