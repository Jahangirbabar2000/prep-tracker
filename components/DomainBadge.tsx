'use client';

import { resolveDomain } from '@/lib/domains';
import { useStore } from '@/lib/store/store';
import { domainIcon, domainPalette } from './domainVisuals';

export default function DomainBadge({ domain, showIcon = true }: { domain: string; showIcon?: boolean }) {
  const { data } = useStore();
  const definition = resolveDomain(data.domains, domain);
  const Icon = domainIcon(definition.icon);
  const palette = domainPalette(definition.color);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset ${palette.badge}`}>
      {showIcon && <Icon size={12} />}
      {definition.name}
    </span>
  );
}
