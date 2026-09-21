'use client';

import { useCallback, useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  DARK_QUERY,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  nextThemePref,
  readThemePref,
  resolveTheme,
  type ThemePref,
} from '@/lib/theme';

interface ThemeToggleProps {
  /** When true, renders as an icon-only button. When false, renders as a full nav row with label. */
  collapsed?: boolean;
}

/** Paint a resolved theme onto the document. Idempotent — safe to re-run. */
function applyTheme(pref: ThemePref) {
  const systemPrefersDark = window.matchMedia(DARK_QUERY).matches;
  const resolved = resolveTheme(pref, systemPrefersDark);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  // Keep the mobile status-bar / safe-area color in sync (matches --bg).
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', THEME_COLORS[resolved]);
}

/**
 * The selected preference, kept in step with localStorage, with every other
 * mounted toggle (via the `themechange` event), and — while on 'system' —
 * with the OS itself.
 */
function useThemePref(): [ThemePref, (next: ThemePref) => void, boolean] {
  const [pref, setPref] = useState<ThemePref>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const sync = () => {
      let stored: string | null = null;
      try {
        stored = localStorage.getItem(THEME_STORAGE_KEY);
      } catch {}
      setPref(readThemePref(stored));
    };
    sync();

    // Keep every ThemeToggle instance (mobile + desktop) in sync.
    window.addEventListener('themechange', sync);
    return () => window.removeEventListener('themechange', sync);
  }, []);

  // The actual new capability: on 'system', follow the OS as it changes rather
  // than only sampling it once at boot. An explicit light/dark preference must
  // keep ignoring the OS, so the listener is scoped to 'system'.
  useEffect(() => {
    if (pref !== 'system') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => applyTheme('system');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [pref]);

  const choose = useCallback((next: ThemePref) => {
    applyTheme(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {}
    window.dispatchEvent(new Event('themechange'));
  }, []);

  return [pref, choose, mounted];
}

const OPTIONS: { value: ThemePref; label: string; Icon: typeof Sun }[] = [
  { value: 'light',  label: 'Light', Icon: Sun },
  { value: 'dark',   label: 'Dark',  Icon: Moon },
  { value: 'system', label: 'Auto',  Icon: Monitor },
];

export default function ThemeToggle({ collapsed = true }: ThemeToggleProps) {
  const [pref, choose, mounted] = useThemePref();

  // Expanded: all three states visible at once, so 'Auto' is discoverable
  // rather than something you find by pressing a button a third time.
  if (!collapsed) {
    return (
      <div
        role="radiogroup"
        aria-label="Theme"
        className="flex items-center gap-0.5 p-0.5 mx-3 rounded-lg bg-surface-2 border border-border"
      >
        {OPTIONS.map(({ value, label, Icon }) => {
          const active = mounted && pref === value;
          return (
            <button
              key={value}
              role="radio"
              aria-checked={active}
              aria-label={label === 'Auto' ? 'Auto (match system)' : label}
              title={label === 'Auto' ? 'Match system setting' : `${label} mode`}
              onClick={() => choose(value)}
              className={[
                // h-11 = 44px: this control also renders in the mobile drawer,
                // so the segments are touch targets, not just pointer targets.
                'flex-1 flex items-center justify-center gap-1 h-11 rounded-md',
                'text-[11px] font-medium transition-colors cursor-pointer',
                active
                  ? 'bg-surface text-fg shadow-sm border border-border-strong'
                  : 'text-muted hover:text-fg border border-transparent',
              ].join(' ')}
            >
              <Icon size={13} className="shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Icon-only: no room for three controls, so press cycles through them. The
  // icon shows the current preference (Monitor when following the OS), not the
  // resolved appearance — otherwise 'Auto' would be invisible.
  const current = OPTIONS.find(o => o.value === pref) ?? OPTIONS[0];
  const Icon = mounted ? current.Icon : Monitor;
  const next = OPTIONS.find(o => o.value === nextThemePref(pref)) ?? OPTIONS[0];

  return (
    <button
      onClick={() => choose(nextThemePref(pref))}
      aria-label={mounted ? `Theme: ${current.label}. Switch to ${next.label}.` : 'Toggle theme'}
      title={mounted ? `Theme: ${current.label}` : undefined}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
    >
      <Icon size={18} />
    </button>
  );
}
