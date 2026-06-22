import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import Nav from '@/components/Nav';
import ScrollToTop from '@/components/ScrollToTop';
import GlobalShortcuts from '@/components/GlobalShortcuts';

export const metadata: Metadata = {
  title: 'Prep Tracker',
};

// Runs before paint to apply the saved theme and avoid a flash of the wrong mode.
const themeScript = `
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <Script id="theme-init" strategy="beforeInteractive" dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0f1117" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Prep" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="antialiased">
        {/* md+: flex row (sidebar | scrollable content). mobile: normal block flow. */}
        <div className="min-h-dvh md:h-dvh md:flex">
          <Nav />
          <main className="flex-1 min-w-0 px-4 sm:px-8 py-8 pb-32 md:pb-10 md:overflow-y-auto">
            <ScrollToTop />
            <GlobalShortcuts />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
