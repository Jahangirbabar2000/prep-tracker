'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Inbox, Binary, Network, Layout, Code2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/',               label: 'Review Queue', short: 'Queue', Icon: Inbox,   domain: null },
  { href: '/dsa',            label: 'DSA',          short: 'DSA',   Icon: Binary,  domain: 'dsa' },
  { href: '/system-design',  label: 'System Design',short: 'SysD',  Icon: Network, domain: 'system_design' },
  { href: '/frontend',       label: 'Frontend',     short: 'FE',    Icon: Layout,  domain: 'frontend' },
  { href: '/python',         label: 'Python',       short: 'Py',    Icon: Code2,   domain: 'python' },
];

export default function Nav() {
  const pathname = usePathname();
  const [todayCounts, setTodayCounts] = useState<Record<string, number>>({});

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  useEffect(() => {
    fetch('/api/stats/today')
      .then(r => r.json())
      .then(setTodayCounts)
      .catch(() => {});
  }, [pathname]); // re-fetch on every navigation so counts stay current

  function CountBadge({ domain }: { domain: string | null }) {
    if (!domain) return null;
    const n = todayCounts[domain] ?? 0;
    if (n === 0) return null;
    return (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-accent text-accent-fg leading-none">
        {n}
      </span>
    );
  }

  return (
    <>
      {/* Desktop top nav */}
      <nav className="hidden md:block border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto w-full flex items-center justify-between px-6">
          <div className="flex items-center gap-1">
            <span className="flex items-center gap-2 pr-4 mr-2 font-semibold text-fg">
              <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg">
                <Binary size={16} />
              </span>
              Prep
            </span>
            {links.map(({ href, label, Icon, domain }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-3 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                  isActive(href)
                    ? 'border-accent text-fg'
                    : 'border-transparent text-muted hover:text-fg'
                }`}
              >
                <Icon size={16} className={isActive(href) ? 'text-accent' : ''} />
                {label}
                <CountBadge domain={domain} />
              </Link>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <span className="flex items-center gap-2 font-semibold text-fg">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg">
            <Binary size={16} />
          </span>
          Prep Tracker
        </span>
        <ThemeToggle />
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-border flex">
        {links.map(({ href, short, Icon, domain }) => {
          const n = domain ? (todayCounts[domain] ?? 0) : 0;
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium min-h-[56px] transition-colors cursor-pointer relative ${
                isActive(href) ? 'text-accent' : 'text-muted'
              }`}
            >
              <span className="relative inline-flex">
                <Icon size={20} />
                {n > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-0.5 rounded-full text-[10px] font-bold bg-accent text-accent-fg leading-none">
                    {n}
                  </span>
                )}
              </span>
              {short}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
