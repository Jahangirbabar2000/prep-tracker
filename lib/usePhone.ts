'use client';

import { useEffect, useState } from 'react';

// Card swiping is a phone-only gesture. On a desktop it competes with text
// selection and there's no reason to drag a card when Prev / Next buttons and
// keyboard shortcuts are right there; on an iPad the card is a wide panel in a
// wide layout, and a horizontal drag across it reads as a scroll, not a flick.
//
// "Phone" therefore means a touch device with a phone-sized viewport: narrow in
// portrait, or short in landscape (a landscape iPhone is ~932×430, while the
// shortest landscape iPad is ~1024×768, so height separates them cleanly).

const PHONE_MAX_WIDTH = 767;   // iPad portrait starts at 768
const PHONE_MAX_HEIGHT = 500;  // landscape phone; every landscape iPad is taller

export const PHONE_MEDIA_QUERY =
  `(pointer: coarse) and ((max-width: ${PHONE_MAX_WIDTH}px) or (max-height: ${PHONE_MAX_HEIGHT}px))`;

/** Pure form of `PHONE_MEDIA_QUERY`, so the rule itself can be unit-tested. */
export function isPhoneLike(width: number, height: number, coarsePointer: boolean): boolean {
  if (!coarsePointer) return false;
  return width <= PHONE_MAX_WIDTH || height <= PHONE_MAX_HEIGHT;
}

/**
 * Whether the current device is a phone. Starts `false` — the gesture is opt-in
 * so the first paint (and SSR) never advertises a drag handle it can't honour —
 * and stays live so rotating or resizing re-evaluates.
 */
export function usePhone(): boolean {
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(PHONE_MEDIA_QUERY);
    setPhone(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setPhone(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return phone;
}
