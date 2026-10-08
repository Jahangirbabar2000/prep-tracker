// The landing page's screenshots, captured from the live demo so they always
// show the current UI:
//
//   BASE_URL=http://localhost:3009 npm run screenshots
//
// Point BASE_URL at a running production build (`next build && next start`)
// — never at a dev server whose database is real; the demo only reads its own
// generated data, but a production build is what visitors see. Writes
// public/screenshots/{queue,session,stats}-{light,dark}.png plus og.png, the
// 1200×630 link-preview image. The demo is seeded and relative to today, so a
// re-run after a UI change gives matching shots.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3007';
const OUT = 'public/screenshots';
mkdirSync(OUT, { recursive: true });

const VIEWS = [
  { name: 'queue', path: '/' },
  // The first card due is a flashcard; Space reveals its answer.
  { name: 'session', path: '/review/session', then: page => page.keyboard.press('Space') },
  { name: 'stats', path: '/stats' },
];

async function enterDemo(browser, theme, viewport) {
  const context = await browser.newContext({ viewport, colorScheme: theme, deviceScaleFactor: 1 });
  await context.addInitScript(value => localStorage.setItem('theme', value), theme);
  const page = await context.newPage();
  await page.goto(`${BASE}/demo`, { waitUntil: 'networkidle' });
  return { context, page };
}

async function capture(page, path, file, then) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  // The shots show the product, not the "you're in the demo" bar.
  await page.addStyleTag({ content: '[data-demo-bar] { display: none !important; }' });
  await page.waitForTimeout(600);
  if (then) { await then(page); await page.waitForTimeout(600); }
  await page.screenshot({ path: file });
  console.log('wrote', file);
}

const browser = await chromium.launch();
try {
  for (const theme of ['light', 'dark']) {
    const { context, page } = await enterDemo(browser, theme, { width: 1440, height: 900 });
    for (const view of VIEWS) await capture(page, view.path, `${OUT}/${view.name}-${theme}.png`, view.then);
    await context.close();
  }
  const { context, page } = await enterDemo(browser, 'dark', { width: 1200, height: 630 });
  await capture(page, '/', `${OUT}/og.png`);
  await context.close();
} finally {
  await browser.close();
}
