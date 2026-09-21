import { describe, it, expect } from 'vitest';
import {
  readThemePref,
  resolveTheme,
  nextThemePref,
  THEME_COLORS,
  type ThemePref,
} from './theme';

describe('readThemePref', () => {
  it('keeps an explicit stored choice', () => {
    expect(readThemePref('light')).toBe('light');
    expect(readThemePref('dark')).toBe('dark');
    expect(readThemePref('system')).toBe('system');
  });

  // The upgrade path: before this preference existed the boot script fell back
  // to prefers-color-scheme whenever the key was missing, so "nothing stored"
  // has always meant "follow the OS".
  it('treats a missing value as system', () => {
    expect(readThemePref(null)).toBe('system');
    expect(readThemePref(undefined)).toBe('system');
    expect(readThemePref('')).toBe('system');
  });

  it('falls back to system rather than trusting a junk value', () => {
    expect(readThemePref('Dark')).toBe('system');
    expect(readThemePref('auto')).toBe('system');
    expect(readThemePref('{"theme":"dark"}')).toBe('system');
  });
});

describe('resolveTheme', () => {
  it('ignores the OS for an explicit preference', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('light', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('dark', true)).toBe('dark');
  });

  it('follows the OS for system', () => {
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });
});

describe('nextThemePref', () => {
  it('cycles light -> dark -> system -> light', () => {
    expect(nextThemePref('light')).toBe('dark');
    expect(nextThemePref('dark')).toBe('system');
    expect(nextThemePref('system')).toBe('light');
  });

  it('returns to the starting point in exactly three presses', () => {
    for (const start of ['light', 'dark', 'system'] as ThemePref[]) {
      expect(nextThemePref(nextThemePref(nextThemePref(start)))).toBe(start);
    }
  });

  it('reaches every state, so no preference is unreachable by cycling', () => {
    const seen = new Set<ThemePref>();
    let p: ThemePref = 'light';
    for (let i = 0; i < 3; i++) {
      seen.add(p);
      p = nextThemePref(p);
    }
    expect(seen).toEqual(new Set(['light', 'dark', 'system']));
  });
});

describe('THEME_COLORS', () => {
  // These feed the theme-color meta tag that the installed PWA paints its
  // status bar with; they are duplicated from --bg in globals.css.
  it('matches the --bg tokens', () => {
    expect(THEME_COLORS.light).toBe('#f4efe2');
    expect(THEME_COLORS.dark).toBe('#141009');
  });
});
