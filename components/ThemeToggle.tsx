'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

interface ThemeToggleProps {
  /** When true, renders as an icon-only button. When false, renders as a full nav row with label. */
  collapsed?: boolean;
}

export default function ThemeToggle({ collapsed = true }: ThemeToggleProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [mounted, setMounted] = useState(false);

  function syncFromDom() {
    setTheme(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  }

  useEffect(() => {
    setMounted(true);
    syncFromDom();
    // Keep every ThemeToggle instance (mobile + desktop) in sync.
    window.addEventListener('themechange', syncFromDom);
    return () => window.removeEventListener('themechange', syncFromDom);
  }, []);

  function toggle() {
    const next = document.documentElement.classList.contains('dark') ? 'light' : 'dark';
    document.documentElement.classList.toggle('dark', next === 'dark');
    // Keep the mobile status-bar / safe-area color in sync (matches --bg).
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', next === 'dark' ? '#0c0a1a' : '#f4f3fb');
    try {
      localStorage.setItem('theme', next);
    } catch {}
    window.dispatchEvent(new Event('themechange'));
  }

  const Icon = mounted && theme === 'dark' ? Sun : Moon;
  const label = mounted && theme === 'dark' ? 'Light mode' : 'Dark mode';

  if (!collapsed) {
    return (
      <button
        onClick={toggle}
        aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
        className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg transition-colors cursor-pointer"
      >
        <Icon size={18} />
        <span className="whitespace-nowrap">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
    >
      <Icon size={18} />
    </button>
  );
}
