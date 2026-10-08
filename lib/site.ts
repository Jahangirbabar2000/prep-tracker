// Who built it, and where it lives — for the landing page's byline and its
// link previews. All optional: a fork shows no one's name until it sets its own.

const clean = (value: string | undefined) => value?.trim() || undefined;

export const AUTHOR = {
  name: clean(process.env.NEXT_PUBLIC_AUTHOR_NAME),
  github: clean(process.env.NEXT_PUBLIC_AUTHOR_GITHUB),
  linkedin: clean(process.env.NEXT_PUBLIC_AUTHOR_LINKEDIN),
};

/** The source repository, linked from "Under the hood". */
export const REPO_URL = clean(process.env.NEXT_PUBLIC_REPO_URL) ?? 'https://github.com/Jahangirbabar2000/prep-tracker';

/**
 * The deployment's public origin, so link previews can use absolute image URLs.
 * NEXT_PUBLIC_SITE_URL wins; on Vercel the production domain is known at build.
 */
export const SITE_URL = clean(process.env.NEXT_PUBLIC_SITE_URL)
  ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'http://localhost:3007');
