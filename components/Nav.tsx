'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Inbox, Binary, Network, Layout, Code2, Settings } from 'lucide-react';
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
  const [dueCounts,   setDueCounts]   = useState<Record<string, number>>({});

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  useEffect(() => {
    fetch('/api/stats/today')
      .then(r => r.json())
      .then((data: { counts: Record<string, number>; due: Record<string, number> }) => {
        setTodayCounts(data.counts ?? {});
        setDueCounts(data.due ?? {});
      })
      .catch(() => {});
  }, [pathname]); // re-fetch on every navigation so counts stay current

  // Total items overdue across all domains — shown only on the Review Queue tab
  const totalDue = Object.values(dueCounts).reduce((s, n) => s + n, 0);

  function Badges({ domain }: { domain: string | null }) {
    // Review Queue tab: show overdue count in red
    if (domain === null) {
      if (totalDue === 0) return null;
      return (
        <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-danger/15 text-danger leading-none">
          {totalDue}
        </span>
      );
    }
    // Domain tabs: show today's new count in green (unchanged)
    const today = todayCounts[domain] ?? 0;
    if (today === 0) return null;
    return (
      <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold bg-accent text-accent-fg leading-none">
        {today}
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
                <Badges domain={domain} />
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/settings"
              className={`p-2 rounded-md transition-colors cursor-pointer ${
                pathname === '/settings' ? 'text-fg' : 'text-muted hover:text-fg'
              }`}
              title="Settings"
            >
              <Settings size={16} className={pathname === '/settings' ? 'text-accent' : ''} />
            </Link>
            <ThemeToggle />
          </div>
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
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            className={`p-2 rounded-md transition-colors cursor-pointer ${
              pathname === '/settings' ? 'text-fg' : 'text-muted hover:text-fg'
            }`}
            title="Settings"
          >
            <Settings size={16} className={pathname === '/settings' ? 'text-accent' : ''} />
          </Link>
          <ThemeToggle />
        </div>
      </div>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-border flex">
        {links.map(({ href, short, Icon, domain }) => {
          // Review Queue: red badge for total overdue; domain tabs: green badge for today count
          const badgeN   = domain === null ? totalDue : (todayCounts[domain] ?? 0);
          const badgeCls = domain === null ? 'bg-danger text-white' : 'bg-accent text-accent-fg';
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
                {badgeN > 0 && (
                  <span className={`absolute -top-1.5 -right-2.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-0.5 rounded-full text-[10px] font-bold leading-none ${badgeCls}`}>
                    {badgeN}
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
