import Nav from '@/components/Nav';
import ScrollToTop from '@/components/ScrollToTop';
import GlobalShortcuts from '@/components/GlobalShortcuts';
import StoreProvider from '@/components/StoreProvider';
import RegisterSW from '@/components/RegisterSW';
import DemoBar from '@/components/DemoBar';

// The signed-in app: the local-first store (and its sync), the sidebar,
// keyboard shortcuts and the offline service worker. Pages outside this group
// — app/(public) — render without any of it, so a signed-out visitor never
// boots the store or calls /api/sync.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
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
          <DemoBar />
          {children}
        </main>
      </div>
    </StoreProvider>
  );
}
