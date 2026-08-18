// The app's mark: a teal card angled behind a gold one, on a dark plate.
//
// The same geometry is rasterised into the favicon and PWA icons by
// scripts/geticon.mjs — if a shape changes here, change it there too and re-run
// `node scripts/geticon.mjs`.
//
// The colors are hard-coded rather than read from the theme tokens on purpose:
// this has to look like the browser-tab and home-screen icon, and those don't
// follow light/dark. The plate stays dark in both themes.
//
// Decorative by default — it's always paired with the wordmark, so a screen
// reader announcing it too would just repeat the name.
// shrink-0 is not optional: an inline <svg> used as a flex item collapses to
// zero width in Chrome even when the row has room to spare.
export default function Logo({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={`shrink-0 ${className}`} aria-hidden="true">
      <defs>
        <linearGradient id="logo-plate" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#2a2114" />
          <stop offset="1" stopColor="#141009" />
        </linearGradient>
        <linearGradient id="logo-gold" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#f2ce77" />
          <stop offset="1" stopColor="#e6bd57" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="114" fill="url(#logo-plate)" />
      <g transform="rotate(-16 256 256)">
        <rect x="90" y="108" width="240" height="304" rx="36" fill="#2dd4bf" />
      </g>
      {/* Keyline under the gold card — without it the two cards merge at small sizes. */}
      <rect x="166" y="90" width="256" height="322" rx="40" fill="#141009" />
      <rect x="178" y="102" width="232" height="298" rx="32" fill="url(#logo-gold)" />
      <rect x="212" y="182" width="164" height="38" rx="19" fill="#141009" />
      <rect x="212" y="258" width="102" height="38" rx="19" fill="#141009" />
    </svg>
  );
}
