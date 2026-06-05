'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle() {
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
    try {
      localStorage.setItem('theme', next);
    } catch {}
    window.dispatchEvent(new Event('themechange'));
  }

  return (
    <button
      onClick={toggle}
      aria-label={mounted ? `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` : 'Toggle theme'}
      className="flex items-center justify-center w-9 h-9 rounded-lg text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
    >
      {mounted && theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
