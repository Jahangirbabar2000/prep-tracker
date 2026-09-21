import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ScrollToTop from '@/components/ScrollToTop';
import GlobalShortcuts from '@/components/GlobalShortcuts';
import StoreProvider from '@/components/StoreProvider';
import RegisterSW from '@/components/RegisterSW';
import { THEME_COLORS, THEME_STORAGE_KEY, DARK_QUERY } from '@/lib/theme';

export const metadata: Metadata = {
  title: 'Prep Tracker',
};

// viewport-fit=cover lets the app draw into the iOS safe areas (notch / home
// indicator). Combined with the themed html background and the black-translucent
// status bar, this makes the status-bar strip follow the selected theme in the
// installed (standalone) PWA instead of showing a white bar.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Runs before paint to apply the saved theme and avoid a flash of the wrong
// mode. Also syncs the theme-color meta so the mobile status bar / safe-area
// matches the selected theme.
//
// This duplicates readThemePref/resolveTheme from lib/theme.ts in plain ES5:
// it has to be a self-contained string that runs before any bundle loads, so
// it cannot import them. The colors and the storage key *are* interpolated
// from that module, so the values can't drift even though the logic is
// restated. Keep the two branches in step if the resolution rule changes.
const themeScript = `
(function() {
  try {
    var raw = localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});
    var pref = (raw === 'light' || raw === 'dark' || raw === 'system') ? raw : 'system';
    var dark = pref === 'dark' ||
      (pref === 'system' && window.matchMedia(${JSON.stringify(DARK_QUERY)}).matches);
    document.documentElement.classList.toggle('dark', dark);
    var color = dark ? ${JSON.stringify(THEME_COLORS.dark)} : ${JSON.stringify(THEME_COLORS.light)};
    var m = document.querySelector('meta[name="theme-color"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
    m.setAttribute('content', color);
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Plain inline script (not next/script): runs once from the SSR HTML
            before paint, and — since RootLayout is a Server Component — is never
            re-rendered/re-executed on the client, so it avoids next/script's
            "script tag while rendering" warning and the resulting hydration desync. */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#141009" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prep" />
        {/* iOS gets its own icon, not the maskable /icon-192.png: iOS ignores
            `purpose: maskable` and applies its own squircle clip, so the
            maskable art's 20% Android safe-zone inset just made the mark look
            small inside an empty plate. 180x180 is the @3x iPhone size.
            Both files come out of scripts/geticon.mjs. */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
      </head>
      <body className="antialiased">
        <StoreProvider>
          <RegisterSW />
          {/* md+: flex row (sidebar | scrollable content). mobile: normal block flow. */}
          {/* md+ (iPad/desktop standalone): inset the top safe area so the
              status bar doesn't overlap the sidebar/header. On mobile the
              top bar handles its own safe-area padding. */}
          <div className="min-h-dvh md:h-dvh md:flex md:pt-[env(safe-area-inset-top,0px)]">
            <Nav />
            <main className="flex-1 min-w-0 overflow-x-clip px-4 sm:px-8 py-6 sm:py-8 pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] md:overflow-y-auto">
              <ScrollToTop />
              <GlobalShortcuts />
              {children}
            </main>
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
