'use client';

import { useSyncExternalStore } from 'react';
import { isDemo } from './mode';

const subscribe = () => () => {};

/** isDemo() for rendering: false on the server and during hydration, the real value after. */
export function useIsDemo(): boolean {
  return useSyncExternalStore(subscribe, isDemo, () => false);
}
