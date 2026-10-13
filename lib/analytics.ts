'use client';

// Product analytics (PostHog), off unless NEXT_PUBLIC_POSTHOG_KEY is set at
// build time — and then loaded on demand, so it isn't in the bundle when off.
//
// What may be sent: page views, and the named events below with counts and
// flags. Never card text, answers, notes, deck names or emails — which is why
// autocapture (it records clicked elements' text) and session replay (it
// records the screen) are off. A person is their internal user id, nothing
// else, and that is reset on sign-out.
import type { PostHog } from 'posthog-js';
import { isDemo } from '@/lib/demo/mode';
import { userHintFrom } from '@/lib/store/localAccount';

const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

let client: Promise<PostHog | null> | null = null;

export type AnalyticsEvent =
  | { name: 'review_logged'; props: { struggled: boolean; study_mode: string; offline: boolean } }
  | { name: 'card_created'; props: { study_mode: string } }
  | { name: 'data_exported'; props?: undefined }
  | { name: 'account_deleted'; props?: undefined };

/** Start analytics for this page (idempotent). A no-op without a key. */
export function initAnalytics(): Promise<PostHog | null> {
  if (!KEY || typeof window === 'undefined') return Promise.resolve(null);
  client ??= import('posthog-js').then(({ default: posthog }) => {
    posthog.init(KEY, {
      // Same-origin, rewritten to PostHog in next.config.ts, so ad blockers
      // don't drop it; ui_host keeps PostHog's own links pointing at PostHog.
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      // Plain JSON: the SDK's gzip body is binary sent as text/plain, and the
      // Lambda behind /ingest passes it on as text, so PostHog got bytes it
      // couldn't parse (400). These payloads are a few hundred bytes anyway.
      disable_compression: true,
      // Off in code, whatever the PostHog dashboard says: each records the
      // screen or what was clicked, which on a review is the card itself.
      autocapture: false,
      disable_session_recording: true,
      enable_heatmaps: false,
      capture_dead_clicks: false,
      capture_exceptions: false,
      capture_pageview: 'history_change',
      capture_pageleave: true,
      person_profiles: 'identified_only',
    });
    // The demo's numbers are the landing page's funnel, not a real account's.
    posthog.register({ demo: isDemo() });
    const userId = isDemo() ? null : userHintFrom(document.cookie);
    if (userId) posthog.identify(userId);
    return posthog;
  }).catch(() => null);
  return client;
}

/** Record one of the events above. Fire-and-forget; never throws. */
export function track<E extends AnalyticsEvent>(name: E['name'], props?: E['props']): void {
  void initAnalytics().then(posthog => posthog?.capture(name, props ?? {})).catch(() => {});
}

/** Forget who this browser was (sign-out, account deletion). */
export async function resetAnalytics(): Promise<void> {
  const posthog = await (client ?? Promise.resolve(null)).catch(() => null);
  posthog?.reset();
}
