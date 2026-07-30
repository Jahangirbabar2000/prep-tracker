import {
  Binary, Network, Blocks, Code2, Layout, Brain, MessagesSquare,
  BookOpen, Database, Globe2, GraduationCap, Languages, Terminal,
  type LucideIcon,
} from 'lucide-react';

export const DOMAIN_ICON_MAP: Record<string, LucideIcon> = {
  binary: Binary,
  network: Network,
  blocks: Blocks,
  code: Code2,
  layout: Layout,
  brain: Brain,
  messages: MessagesSquare,
  book: BookOpen,
  database: Database,
  globe: Globe2,
  'graduation-cap': GraduationCap,
  languages: Languages,
  terminal: Terminal,
};

export interface DomainPalette {
  badge: string;
  text: string;
  dot: string;
  bar: string;
  tagShades: string[];
}

export const DOMAIN_PALETTES: Record<string, DomainPalette> = {
  blue: {
    badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 ring-blue-500/20',
    text: 'text-blue-500 dark:text-blue-400', dot: 'bg-blue-500', bar: 'bg-blue-500',
    tagShades: ['bg-blue-500/10 text-blue-500', 'bg-indigo-500/10 text-indigo-500', 'bg-sky-500/10 text-sky-500'],
  },
  orange: {
    badge: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 ring-orange-500/20',
    text: 'text-orange-500 dark:text-orange-400', dot: 'bg-orange-500', bar: 'bg-orange-500',
    tagShades: ['bg-orange-500/10 text-orange-500', 'bg-amber-500/10 text-amber-500', 'bg-yellow-500/10 text-yellow-500'],
  },
  amber: {
    badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-amber-500/20',
    text: 'text-amber-500 dark:text-amber-400', dot: 'bg-amber-500', bar: 'bg-amber-500',
    tagShades: ['bg-amber-500/10 text-amber-500', 'bg-yellow-500/10 text-yellow-500', 'bg-orange-500/10 text-orange-500'],
  },
  emerald: {
    badge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-emerald-500/20',
    text: 'text-emerald-500 dark:text-emerald-400', dot: 'bg-emerald-500', bar: 'bg-emerald-500',
    tagShades: ['bg-emerald-500/10 text-emerald-500', 'bg-teal-500/10 text-teal-500', 'bg-green-500/10 text-green-500'],
  },
  violet: {
    badge: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 ring-violet-500/20',
    text: 'text-violet-500 dark:text-violet-400', dot: 'bg-violet-500', bar: 'bg-violet-500',
    tagShades: ['bg-violet-500/10 text-violet-500', 'bg-purple-500/10 text-purple-500', 'bg-fuchsia-500/10 text-fuchsia-500'],
  },
  rose: {
    badge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 ring-rose-500/20',
    text: 'text-rose-500 dark:text-rose-400', dot: 'bg-rose-500', bar: 'bg-rose-500',
    tagShades: ['bg-rose-500/10 text-rose-500', 'bg-pink-500/10 text-pink-500', 'bg-red-500/10 text-red-500'],
  },
  teal: {
    badge: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 ring-teal-500/20',
    text: 'text-teal-500 dark:text-teal-400', dot: 'bg-teal-500', bar: 'bg-teal-500',
    tagShades: ['bg-teal-500/10 text-teal-500', 'bg-cyan-500/10 text-cyan-500', 'bg-emerald-500/10 text-emerald-500'],
  },
  cyan: {
    badge: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 ring-cyan-500/20',
    text: 'text-cyan-500 dark:text-cyan-400', dot: 'bg-cyan-500', bar: 'bg-cyan-500',
    tagShades: ['bg-cyan-500/10 text-cyan-500', 'bg-sky-500/10 text-sky-500', 'bg-blue-500/10 text-blue-500'],
  },
};

export function domainPalette(color: string): DomainPalette {
  return DOMAIN_PALETTES[color] ?? DOMAIN_PALETTES.blue;
}

export function domainIcon(icon: string): LucideIcon {
  return DOMAIN_ICON_MAP[icon] ?? BookOpen;
}
