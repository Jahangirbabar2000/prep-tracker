import type { Metadata, Viewport } from 'next';
import './globals.css';
import Nav from '@/components/Nav';
import ScrollToTop from '@/components/ScrollToTop';
import GlobalShortcuts from '@/components/GlobalShortcuts';
import StoreProvider from '@/components/StoreProvider';
import RegisterSW from '@/components/RegisterSW';

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
// matches the selected theme (must stay in sync with --bg in globals.css).
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    var dark = t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
    var color = dark ? '#0c0a1a' : '#f4f3fb';
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
        <meta name="theme-color" content="#0c0a1a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prep" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
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
