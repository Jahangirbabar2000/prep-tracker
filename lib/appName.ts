/**
 * The name in the sidebar, on the login screen and in the browser tab. Set
 * NEXT_PUBLIC_APP_NAME to make a deployment yours ("Jahangir's Prep");
 * without it, a copy someone else deploys reads as the product rather than as
 * the original author's tracker. NEXT_PUBLIC_, so it's inlined at build time —
 * changing it needs a redeploy.
 */
export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || 'Prep Tracker';
