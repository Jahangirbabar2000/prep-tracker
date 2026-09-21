/**
 * Theme preference — the three-state model behind the theme toggle.
 *
 * The *preference* is what the user picked ('system' included); the *resolved*
 * theme is the `dark` class the document actually carries. Keeping them apart
 * is the whole point: 'system' has no fixed appearance, so it has to be stored
 * as itself rather than as whatever the OS happened to say at the time.
 */

export type ThemePref = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'theme';

/** The media query 'system' follows. */
export const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Status-bar / safe-area color per resolved theme — the installed PWA draws
 * its top strip from this. Must stay in sync with `--bg` in globals.css.
 */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: '#f4efe2',
  dark:  '#141009',
};

/**
 * A stored value -> a preference.
 *
 * Anything unrecognised — including nothing stored at all — is 'system'. That
 * is exactly what the app did before this preference existed (the boot script
 * fell back to `prefers-color-scheme` whenever the key was absent), so anyone
 * who never touched the toggle keeps following the OS and simply gains a name
 * for the state they were already in. A stored 'light'/'dark' was a deliberate
 * choice and stays deliberate; it is not silently reinterpreted as 'system'.
 */
export function readThemePref(raw: string | null | undefined): ThemePref {
  return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
}

/** The class the document gets: 'system' asks the OS, the others are literal. */
export function resolveTheme(pref: ThemePref, systemPrefersDark: boolean): ResolvedTheme {
  if (pref === 'system') return systemPrefersDark ? 'dark' : 'light';
  return pref;
}

/**
 * Cycle order for the icon-only toggle, where there is no room for three
 * controls. Light -> Dark -> System, so the two explicit modes come first and
 * one more press always returns you to following the OS.
 */
const CYCLE: readonly ThemePref[] = ['light', 'dark', 'system'];

export function nextThemePref(pref: ThemePref): ThemePref {
  const i = CYCLE.indexOf(pref);
  return CYCLE[(i + 1) % CYCLE.length];
}
