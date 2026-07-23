import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Nav from '@/components/Nav';
import ScrollToTop from '@/components/ScrollToTop';
import GlobalShortcuts from '@/components/GlobalShortcuts';
import StoreProvider from '@/components/StoreProvider';
import RegisterSW from '@/components/RegisterSW';

export const metadata: Metadata = {
  title: 'Prep Tracker',
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
    var color = dark ? '#0a0f1a' : '#f6f7f9';
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
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0f1a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prep" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased">
        <StoreProvider>
          <RegisterSW />
          {/* md+: flex row (sidebar | scrollable content). mobile: normal block flow. */}
          <div className="min-h-dvh md:h-dvh md:flex">
            <Nav />
            <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 pb-10 md:overflow-y-auto">
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
