// Pages a signed-out visitor can open: the login screen, and later the landing
// page. No store, no sidebar, no shortcuts, no service worker — see
// app/(app)/layout.tsx for the signed-in shell.
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <main className="min-h-dvh">{children}</main>;
}
