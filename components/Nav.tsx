'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Inbox, Binary, Network, Layout, Code2, Brain, Blocks, MessagesSquare,
  Settings, ChevronLeft, ChevronRight, BarChart3, Menu, X,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import { useStore } from '@/lib/store/store';
import { todayStats, clientToday } from '@/lib/store/queries';
import SyncStatus from './SyncStatus';

const links = [
  { href: '/',              label: 'Review Queue', short: 'Queue', Icon: Inbox,   domain: null },
  { href: '/dsa',           label: 'DSA',          short: 'DSA',   Icon: Binary,  domain: 'dsa' },
  { href: '/system-design', label: 'System Design',short: 'SysD',  Icon: Network, domain: 'system_design' },
  { href: '/lld',           label: 'LLD',          short: 'LLD',   Icon: Blocks,  domain: 'lld' },
  { href: '/backend',        label: 'Backend',       short: 'BE',    Icon: Code2,   domain: 'python' },
  { href: '/frontend',      label: 'Frontend',     short: 'FE',    Icon: Layout,  domain: 'frontend' },
  { href: '/ai',            label: 'AI',           short: 'AI',    Icon: Brain,   domain: 'ai' },
  { href: '/behavioral',    label: 'Behavioral',   short: 'Beh',   Icon: MessagesSquare, domain: 'behavioral' },
];

export default function Nav() {
  const pathname = usePathname();
  const { data } = useStore();
  const { counts: todayCounts, due: dueCounts } = todayStats(data, clientToday());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('nav-collapsed') === 'true') setCollapsed(true);
  }, []);

  // Close the drawer on navigation.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile drawer is open.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMobileOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

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

  function SidebarLink({
    href, label, Icon, domain, compact = false, onNavigate,
  }: {
    href: string;
    label: string;
    Icon: typeof Inbox;
    domain: string | null;
    compact?: boolean;
    onNavigate?: () => void;
  }) {
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
          onClick={onNavigate}
          className={[
            'flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer',
            compact ? 'justify-center py-3 px-3' : 'gap-3 px-3 py-2.5',
            active
              ? 'bg-surface-2 text-fg'
              : 'text-muted hover:bg-surface-2 hover:text-fg',
          ].join(' ')}
        >
          <span className="relative shrink-0">
            <Icon size={18} className={active ? 'text-accent' : ''} />
            {compact && badgeN > 0 && (
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${dotCls}`} />
            )}
          </span>

          {!compact && (
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

        {compact && (
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

  function FooterLinks({ compact = false, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
    return (
      <div className="flex flex-col gap-0.5 py-3 px-2 border-t border-border shrink-0">
        <div className="relative group">
          <Link
            href="/stats"
            onClick={onNavigate}
            className={[
              'flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer',
              compact ? 'justify-center py-3 px-3' : 'gap-3 px-3 py-2.5',
              pathname === '/stats'
                ? 'bg-surface-2 text-fg'
                : 'text-muted hover:bg-surface-2 hover:text-fg',
            ].join(' ')}
          >
            <BarChart3 size={18} className={pathname === '/stats' ? 'text-accent' : ''} />
            {!compact && <span className="whitespace-nowrap">Stats</span>}
          </Link>
          {compact && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none hidden group-hover:block">
              <div className="bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                <span className="text-xs font-medium text-fg">Stats</span>
              </div>
            </div>
          )}
        </div>

        <div className="relative group">
          <Link
            href="/settings"
            onClick={onNavigate}
            className={[
              'flex items-center rounded-lg text-sm font-medium transition-colors cursor-pointer',
              compact ? 'justify-center py-3 px-3' : 'gap-3 px-3 py-2.5',
              pathname === '/settings'
                ? 'bg-surface-2 text-fg'
                : 'text-muted hover:bg-surface-2 hover:text-fg',
            ].join(' ')}
          >
            <Settings size={18} className={pathname === '/settings' ? 'text-accent' : ''} />
            {!compact && <span className="whitespace-nowrap">Settings</span>}
          </Link>
          {compact && (
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none hidden group-hover:block">
              <div className="bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                <span className="text-xs font-medium text-fg">Settings</span>
              </div>
            </div>
          )}
        </div>

        {compact ? (
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
        {!compact && (
          <div className="px-3 pt-1">
            <SyncStatus />
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
        <div className={[
          'flex items-center h-14 border-b border-border shrink-0',
          collapsed ? 'justify-center px-2' : 'px-3',
        ].join(' ')}>
          <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg shrink-0">
            <Binary size={16} />
          </span>
          {!collapsed && (
            <span className="font-semibold text-fg text-sm whitespace-nowrap flex-1 ml-2.5">Jahangir&apos;s Prep</span>
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

        <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto">
          {links.map(({ href, label, Icon, domain }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} domain={domain} compact={collapsed} />
          ))}
        </nav>

        <FooterLinks compact={collapsed} />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between gap-2 px-3 h-14 border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            className="flex items-center justify-center w-10 h-10 rounded-md text-fg hover:bg-surface-2 transition-colors cursor-pointer shrink-0"
          >
            <Menu size={22} />
          </button>
          <span className="flex items-center gap-2 font-semibold text-fg truncate">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg shrink-0">
              <Binary size={16} />
            </span>
            <span className="truncate">Jahangir&apos;s Prep</span>
          </span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <SyncStatus compact />
          <ThemeToggle />
        </div>
      </div>

      {/* ── Mobile drawer ────────────────────────────────────────────────── */}
      <div
        className={[
          'md:hidden fixed inset-0 z-50',
          mobileOpen ? 'pointer-events-auto' : 'pointer-events-none',
        ].join(' ')}
        aria-hidden={!mobileOpen}
      >
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
          className={[
            'absolute inset-0 bg-black/40 transition-opacity duration-200 cursor-pointer',
            mobileOpen ? 'opacity-100' : 'opacity-0',
          ].join(' ')}
        />

        <aside
          className={[
            'absolute inset-y-0 left-0 w-[min(300px,86vw)] flex flex-col bg-surface border-r border-border shadow-xl',
            'transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="flex items-center gap-2 h-14 px-3 border-b border-border shrink-0">
            <span className="flex items-center justify-center w-7 h-7 rounded-md bg-accent text-accent-fg shrink-0">
              <Binary size={16} />
            </span>
            <span className="font-semibold text-fg text-sm flex-1 truncate">Jahangir&apos;s Prep</span>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="flex items-center justify-center w-9 h-9 rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <nav className="flex-1 flex flex-col gap-0.5 py-3 px-2 overflow-y-auto">
            {links.map(({ href, label, Icon, domain }) => (
              <SidebarLink
                key={href}
                href={href}
                label={label}
                Icon={Icon}
                domain={domain}
                onNavigate={() => setMobileOpen(false)}
              />
            ))}
          </nav>

          <FooterLinks onNavigate={() => setMobileOpen(false)} />
        </aside>
      </div>
    </>
  );
}
