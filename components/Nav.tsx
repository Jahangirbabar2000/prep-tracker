'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Inbox, Binary, Network, Layout, Code2, Brain, Settings, ChevronLeft, ChevronRight } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useStore } from '@/lib/store/store';
import { todayStats, clientToday } from '@/lib/store/queries';
import SyncStatus from './SyncStatus';

const links = [
  { href: '/',              label: 'Review Queue', short: 'Queue', Icon: Inbox,   domain: null },
  { href: '/dsa',           label: 'DSA',          short: 'DSA',   Icon: Binary,  domain: 'dsa' },
  { href: '/system-design', label: 'System Design',short: 'SysD',  Icon: Network, domain: 'system_design' },
  { href: '/frontend',      label: 'Frontend',     short: 'FE',    Icon: Layout,  domain: 'frontend' },
  { href: '/backend',        label: 'Backend',       short: 'BE',    Icon: Code2,   domain: 'python' },
  { href: '/ai',            label: 'AI',           short: 'AI',    Icon: Brain,   domain: 'ai' },
];

export default function Nav() {
  const pathname = usePathname();
  const { data } = useStore();
  const { counts: todayCounts, due: dueCounts } = todayStats(data, clientToday());
  const [collapsed,   setCollapsed]   = useState(false);

  // Read saved collapse state on mount (after hydration to avoid mismatch)
  useEffect(() => {
    if (localStorage.getItem('nav-collapsed') === 'true') setCollapsed(true);
  }, []);

  function toggleCollapse() {
    setCollapsed(c => {
      const next = !c;
      localStorage.setItem('nav-collapsed', String(next));
      return next;
    });
  }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  const totalDue = Object.values(dueCounts).reduce((s, n) => s + n, 0);

  function badgeFor(domain: string | null) {
    if (domain === null) return { n: totalDue, isDanger: true };
    return { n: todayCounts[domain] ?? 0, isDanger: false };
  }

  // ── Shared nav link component ──────────────────────────────────────────
  function SidebarLink({ href, label, Icon, domain }: { href: string; label: string; Icon: typeof Inbox; domain: string | null }) {
    const active = isActive(href);
    const { n: badgeN, isDanger } = badgeFor(domain);
    const badgeCls = isDanger
      ? 'bg-danger/15 text-danger'
      : 'bg-accent text-accent-fg';
    const dotCls = isDanger ? 'bg-danger' : 'bg-accent';

    return (
      <div className="relative group">
        <Link
          href={href}
          className={[
            'flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer',
            collapsed ? 'justify-center py-3 px-3' : 'gap-3 px-3 py-2.5',
            active
              ? 'bg-surface-2 text-fg'
              : 'text-muted hover:bg-surface-2 hover:text-fg',
          ].join(' ')}
        >
          {/* Icon with dot indicator in collapsed mode */}
          <span className="relative shrink-0">
            <Icon size={18} className={active ? 'text-accent' : ''} />
            {collapsed && badgeN > 0 && (
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${dotCls}`} />
            )}
          </span>

          {/* Label + pill badge — hidden when collapsed */}
          {!collapsed && (
            <>
              <span className="flex-1 whitespace-nowrap truncate">{label}</span>
              {badgeN > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold leading-none shrink-0 ${badgeCls}`}>
                  {badgeN}
                </span>
              )}
            </>
          )}
        </Link>

        {/* Tooltip — only in collapsed mode */}
        {collapsed && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none hidden group-hover:block">
            <div className="bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 shadow-lg flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs font-medium text-fg">{label}</span>
              {badgeN > 0 && (
                <span className={`inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[10px] font-semibold leading-none ${badgeCls}`}>
                  {badgeN}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop sidebar ──────────────────────────────────────────────── */}
      <aside
        className={[
          'hidden md:flex flex-col shrink-0 h-full border-r border-border bg-surface overflow-hidden',
          'transition-[width] duration-200',
          collapsed ? 'w-[60px]' : 'w-[220px]',
        ].join(' ')}
      >
        {/* Logo / brand + collapse toggle */}
        <div className={[
          'flex items-center h-14 border-b border-border shrink-0',
          collapsed ? 'justify-center px-2' : 'px-3',
        ].join(' ')}>
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg shrink-0">
            <Binary size={16} />
          </span>
          {!collapsed && (
            <span className="font-semibold text-fg text-sm whitespace-nowrap flex-1 ml-2.5">Jahangir's Prep</span>
          )}
          <button
            onClick={toggleCollapse}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={[
              'flex items-center justify-center w-7 h-7 rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer shrink-0',
              collapsed ? 'mt-0' : 'ml-1',
            ].join(' ')}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto">
          {links.map(({ href, label, Icon, domain }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} domain={domain} />
          ))}
        </nav>

        {/* Bottom: settings, theme toggle, collapse */}
        <div className="flex flex-col gap-0.5 py-3 px-2 border-t border-border shrink-0">
          {/* Settings link */}
          <div className="relative group">
            <Link
              href="/settings"
              className={[
                'flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer',
                collapsed ? 'justify-center py-3 px-3' : 'gap-3 px-3 py-2.5',
                pathname === '/settings'
                  ? 'bg-surface-2 text-fg'
                  : 'text-muted hover:bg-surface-2 hover:text-fg',
              ].join(' ')}
            >
              <Settings size={18} className={pathname === '/settings' ? 'text-accent' : ''} />
              {!collapsed && <span className="whitespace-nowrap">Settings</span>}
            </Link>
            {collapsed && (
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none hidden group-hover:block">
                <div className="bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                  <span className="text-xs font-medium text-fg">Settings</span>
                </div>
              </div>
            )}
          </div>

          {/* Theme toggle */}
          {collapsed ? (
            <div className="relative group flex justify-center">
              <ThemeToggle collapsed={true} />
              <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none hidden group-hover:block">
                <div className="bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                  <span className="text-xs font-medium text-fg">Toggle theme</span>
                </div>
              </div>
            </div>
          ) : (
            <ThemeToggle collapsed={false} />
          )}
          {!collapsed && (
            <div className="px-3 pt-1">
              <SyncStatus />
            </div>
          )}
        </div>
      </aside>

      {/* ── Mobile top bar (unchanged) ───────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <span className="flex items-center gap-2 font-semibold text-fg">
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg">
            <Binary size={16} />
          </span>
          Jahangir's Prep Tracker
        </span>
        <div className="flex items-center gap-2">
          <SyncStatus compact />
          <ThemeToggle />
        </div>
      </div>

      {/* ── Mobile bottom nav (unchanged) ────────────────────────────────── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur border-t border-border flex">
        {links.map(({ href, short, Icon, domain }) => {
          const badgeN   = domain === null ? totalDue : (todayCounts[domain] ?? 0);
          const badgeCls = domain === null ? 'bg-danger text-white' : 'bg-accent text-accent-fg';
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-4 text-[11px] font-medium min-h-[72px] transition-colors cursor-pointer relative ${
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
