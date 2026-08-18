'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Inbox,
  Settings, ChevronLeft, ChevronRight, BarChart3, Menu, X,
} from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import { useStore } from '@/lib/store/store';
import { todayStats, clientToday } from '@/lib/store/queries';
import SyncStatus from './SyncStatus';
import { activeDomains } from '@/lib/domains';
import { domainIcon } from './domainVisuals';

export default function Nav() {
  const pathname = usePathname();
  const { data } = useStore();
  const links = [
    { href: '/', label: 'Review Queue', Icon: Inbox, domain: null },
    ...activeDomains(data.domains).map(domain => ({
      href: `/${domain.slug}`,
      label: domain.name,
      Icon: domainIcon(domain.icon),
      domain: domain.id,
    })),
  ];
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

  // The login page renders full-screen without app chrome.
  if (pathname === '/login') return null;

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

  // Two independent counts per row: how many cards are due (urgent, red) and
  // how many were added today (progress, accent). The aggregate queue link has
  // no "added today" of its own — its number is the total due.
  function badgeFor(domain: string | null): { due: number; today: number } {
    if (domain === null) return { due: totalDue, today: 0 };
    return { due: dueCounts[domain] ?? 0, today: todayCounts[domain] ?? 0 };
  }

  // bg-danger/10 rather than /15: app/globals.css hand-writes its semantic
  // opacity utilities and has no @theme block, so Tailwind never generates a
  // ratio it hasn't been given. /15 is defined for accent-2 only — the
  // bg-danger/15 that used to be here emitted no CSS at all.
  const DUE_BADGE_CLS = 'bg-danger/10 text-danger';
  const TODAY_BADGE_CLS = 'bg-accent text-accent-fg';

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
    const { due, today } = badgeFor(domain);
    const hasBadge = due > 0 || today > 0;
    // Collapsed rail shows a single dot; due is the more urgent of the two.
    const dotCls = due > 0 ? 'bg-danger' : 'bg-accent';
    const pillCls = 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-semibold leading-none shrink-0';

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
            {compact && hasBadge && (
              <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${dotCls}`} />
            )}
          </span>

          {!compact && (
            <>
              <span className="flex-1 whitespace-nowrap truncate">{label}</span>
              {due > 0 && (
                <span className={`${pillCls} ${DUE_BADGE_CLS}`} title={`${due} due`}>{due}</span>
              )}
              {today > 0 && (
                <span className={`${pillCls} ${TODAY_BADGE_CLS}`} title={`${today} added today`}>{today}</span>
              )}
            </>
          )}
        </Link>

        {compact && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none hidden group-hover:block">
            <div className="bg-surface border border-border-strong rounded-lg px-2.5 py-1.5 shadow-lg flex items-center gap-2 whitespace-nowrap">
              <span className="text-xs font-medium text-fg">{label}</span>
              {/* The collapsed rail can only show one dot, so the tooltip is
                  where both counts are actually legible. */}
              {due > 0 && <span className="text-[10px] font-semibold text-danger">{due} due</span>}
              {today > 0 && <span className="text-[10px] font-semibold text-accent">{today} today</span>}
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
          <Link href="/" className="flex items-center flex-1 min-w-0 rounded-md hover:opacity-80 transition-opacity">
            <Logo className="w-7 h-7" />
            {!collapsed && (
              <span className="font-semibold text-fg text-sm whitespace-nowrap truncate ml-2.5">Jahangir&apos;s Prep</span>
            )}
          </Link>
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
          {/* Review Queue is the aggregate view; a rule sets it apart from the
              individual study domains below. */}
          <SidebarLink {...links[0]} compact={collapsed} />
          <div className="mx-2 my-1.5 border-t border-border" aria-hidden />
          {links.slice(1).map(({ href, label, Icon, domain }) => (
            <SidebarLink key={href} href={href} label={label} Icon={Icon} domain={domain} compact={collapsed} />
          ))}
        </nav>

        <FooterLinks compact={collapsed} />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────────────────────── */}
      <div className="md:hidden flex items-center justify-between gap-2 px-3 h-topbar pt-safe border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
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
          <Link href="/" className="flex items-center gap-2 font-semibold text-fg truncate hover:opacity-80 transition-opacity">
            <Logo className="w-7 h-7" />
            <span className="truncate">Jahangir&apos;s Prep</span>
          </Link>
        </div>
        <div className="flex items-center shrink-0">
          <span className="mr-1.5"><SyncStatus compact /></span>
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
            'absolute inset-y-0 left-0 w-[min(272px,78vw)] pt-safe pb-safe flex flex-col bg-surface border-r border-border shadow-xl',
            'transition-transform duration-300 ease-out',
            mobileOpen ? 'translate-x-0' : '-translate-x-full',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          <div className="flex items-center gap-2 h-14 px-3 border-b border-border shrink-0">
            <Link
              href="/"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity"
            >
              <Logo className="w-7 h-7" />
              <span className="font-semibold text-fg text-sm truncate">Jahangir&apos;s Prep</span>
            </Link>
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
            <SidebarLink {...links[0]} onNavigate={() => setMobileOpen(false)} />
            <div className="mx-2 my-1.5 border-t border-border" aria-hidden />
            {links.slice(1).map(({ href, label, Icon, domain }) => (
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
