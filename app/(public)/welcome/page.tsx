import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, ExternalLink, Zap, WifiOff, ShieldCheck, Layers, FlaskConical, TestTube2 } from 'lucide-react';
import Logo from '@/components/Logo';
import { APP_NAME } from '@/lib/appName';
import { LOOP_STEPS } from '@/lib/loopSteps';
import { safeNextPath } from '@/lib/routing';
import { AUTHOR, REPO_URL } from '@/lib/site';

// The page a signed-out visitor sees at "/" (proxy.ts rewrites to it) or at
// /welcome. Static content only: no store, no session, nothing to load.

const DESCRIPTION = 'A spaced-repetition tracker for technical interview prep: log what you study, and each problem or concept comes back the day you’re about to forget it.';

export const metadata: Metadata = {
  title: `${APP_NAME} — interview prep that remembers for you`,
  description: DESCRIPTION,
  openGraph: {
    title: `${APP_NAME} — interview prep that remembers for you`,
    description: DESCRIPTION,
    images: [{ url: '/screenshots/og.png', width: 1200, height: 630, alt: 'The Review Queue: cards due today across DSA, System Design and AWS' }],
  },
  twitter: { card: 'summary_large_image', images: ['/screenshots/og.png'] },
};

/** A screenshot in both themes; the one matching the page's theme shows. */
function Shot({ name, alt, priority = false }: { name: string; alt: string; priority?: boolean }) {
  const common = { width: 1440, height: 900, loading: priority ? 'eager' as const : 'lazy' as const, className: 'w-full h-auto rounded-xl border border-border shadow-sm' };
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element -- static, pre-sized files; no optimizer needed */}
      <img src={`/screenshots/${name}-light.png`} alt={alt} {...common} className={`${common.className} dark:hidden`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`/screenshots/${name}-dark.png`} alt={alt} {...common} className={`${common.className} hidden dark:block`} />
    </>
  );
}

const UNDER_THE_HOOD = [
  { icon: WifiOff, title: 'Local-first, works offline', detail: 'Every screen reads from an in-browser store kept in IndexedDB, so it opens instantly and keeps working without a connection. Installable as a PWA.' },
  { icon: ShieldCheck, title: 'An offline queue that can’t double-count', detail: 'Reviews made offline queue up and replay later. Each carries an idempotency key, so a retried send is recognised instead of counted twice.' },
  { icon: Layers, title: 'A schedule derived from history', detail: 'A card’s level is replayed from its full attempt history, and each review and its new level commit in one database transaction.' },
  { icon: Zap, title: 'Next.js 16 and Turso', detail: 'React 19 on the App Router, libSQL/Turso on the server, deployed on Vercel.' },
  { icon: TestTube2, title: 'Tested', detail: 'Hundreds of Vitest unit tests, including the scheduler, the sync queue and the routing rules, plus Playwright end-to-end tests.' },
  { icon: FlaskConical, title: 'A demo that touches nothing', detail: 'The demo runs the real app on generated sample data in its own browser database. Nothing it does can reach a server.' },
];

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const signIn = `/login${next === '/' ? '' : `?next=${encodeURIComponent(next)}`}`;
  const authOn = !!process.env.AUTH_SECRET && !!process.env.APP_PASSWORD;

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      <header className="flex items-center justify-between py-5">
        <span className="inline-flex items-center gap-2.5 font-semibold text-fg">
          <Logo className="h-8 w-8" /> {APP_NAME}
        </span>
        {authOn && (
          <Link href={signIn} className="inline-flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:text-fg">
            Sign in
          </Link>
        )}
      </header>

      <section className="pt-10 pb-12 text-center sm:pt-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">Spaced repetition for interview prep</p>
        <h1 className="font-display mx-auto mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-fg sm:text-5xl">
          Interview prep that remembers for you.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
          Log the problems and concepts you study. Each one comes back on the day you’re about to forget it, then again
          3, 7, 14, 30 and 60 days later, until it sticks.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo is a route that sets a cookie and redirects; it needs a full page load */}
          <a href="/demo" className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-base font-semibold text-accent-fg transition-colors hover:bg-accent-hover">
            Try the demo <ArrowRight size={18} />
          </a>
          {authOn && (
            <Link href={signIn} className="inline-flex min-h-12 items-center rounded-xl border border-border bg-surface px-6 text-base font-medium text-fg transition-colors hover:border-border-strong">
              Sign in
            </Link>
          )}
        </div>
        <p className="mt-3 text-xs text-muted">No sign-up. The demo runs on sample cards, entirely in your browser.</p>
      </section>

      <section aria-label="The Review Queue">
        <Shot name="queue" alt="The Review Queue: today’s due cards across DSA, System Design and AWS, with a progress ring and a streak" priority />
      </section>

      <section className="py-16 sm:py-20">
        <h2 className="font-display text-center text-2xl font-semibold tracking-tight text-fg sm:text-3xl">How it works</h2>
        <ol className="mt-8 grid gap-4 sm:grid-cols-3">
          {LOOP_STEPS.map(([title, detail], i) => (
            <li key={title} className="rounded-2xl border border-border bg-surface p-5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-semibold text-accent">{i + 1}</span>
              <h3 className="mt-3 font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="grid items-center gap-8 sm:grid-cols-5">
        <div className="sm:col-span-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">Active recall, not rereading</h2>
          <p className="mt-3 leading-relaxed text-muted">
            The answer stays hidden until you’ve tried. Reveal it, then grade yourself — and the card is rescheduled on the spot.
            Timed problems log how long you took.
          </p>
        </div>
        <div className="sm:col-span-3">
          <Shot name="session" alt="A review session: a System Design question with its answer revealed and Got it / Struggled buttons" />
        </div>
      </section>

      <section className="grid items-center gap-8 py-16 sm:grid-cols-5 sm:py-20">
        <div className="sm:order-2 sm:col-span-2">
          <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">See what’s actually sticking</h2>
          <p className="mt-3 leading-relaxed text-muted">
            Recall rate, a study heatmap, how each deck is progressing, and the cards that keep slipping.
          </p>
        </div>
        <div className="sm:order-1 sm:col-span-3">
          <Shot name="stats" alt="The Stats page: recall rate, due count, retained cards, an activity heatmap and the proficiency split" />
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface px-5 py-10 sm:px-10">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-fg">Under the hood</h2>
        <p className="mt-2 text-muted">For the engineers reading: what makes it work.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {UNDER_THE_HOOD.map(({ icon: Icon, title, detail }) => (
            <li key={title}>
              <Icon size={20} className="text-accent" aria-hidden />
              <h3 className="mt-2 font-semibold text-fg">{title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted">{detail}</p>
            </li>
          ))}
        </ul>
        <a href={REPO_URL} className="mt-8 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-accent hover:underline">
          Read the code on GitHub <ExternalLink size={14} aria-hidden />
        </a>
      </section>

      <section className="py-16 text-center sm:py-20">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-fg sm:text-3xl">See it with real-looking data</h2>
        <p className="mx-auto mt-3 max-w-xl text-muted">Three months of reviews across 40 sample cards — due today, overdue, struggling and mastered.</p>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- /demo is a route that sets a cookie and redirects; it needs a full page load */}
        <a href="/demo" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-accent px-6 text-base font-semibold text-accent-fg transition-colors hover:bg-accent-hover">
          Try the demo <ArrowRight size={18} />
        </a>
      </section>

      <footer className="flex flex-col items-center justify-between gap-3 border-t border-border py-8 text-sm text-muted sm:flex-row">
        <span>{AUTHOR.name ? <>Built by <span className="font-medium text-fg">{AUTHOR.name}</span></> : APP_NAME}</span>
        <span className="flex items-center gap-1">
          {AUTHOR.github && <a href={AUTHOR.github} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 hover:text-fg">GitHub <ExternalLink size={13} aria-hidden /></a>}
          {AUTHOR.linkedin && <a href={AUTHOR.linkedin} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 hover:text-fg">LinkedIn <ExternalLink size={13} aria-hidden /></a>}
        </span>
      </footer>
    </div>
  );
}
