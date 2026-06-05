'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Inbox, Binary, Network, Layout, Code2 } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const links = [
  { href: '/', label: 'Review Queue', short: 'Queue', Icon: Inbox },
  { href: '/dsa', label: 'DSA', short: 'DSA', Icon: Binary },
  { href: '/system-design', label: 'System Design', short: 'SysD', Icon: Network },
  { href: '/frontend', label: 'Frontend', short: 'FE', Icon: Layout },
  { href: '/python', label: 'Python', short: 'Py', Icon: Code2 },
];

export default function Nav() {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

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
            {links.map(({ href, label, Icon }) => (
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
              </Link>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </nav>

      {/* Mobile top bar (brand + theme) */}
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
        {links.map(({ href, short, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium min-h-[56px] transition-colors cursor-pointer ${
              isActive(href) ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon size={20} />
            {short}
          </Link>
        ))}
      </nav>
    </>
  );
}
