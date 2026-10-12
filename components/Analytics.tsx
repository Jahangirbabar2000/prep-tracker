'use client';

import { useEffect } from 'react';
import { initAnalytics } from '@/lib/analytics';

/** Mounted once in the root layout: page views for every page, signed in or not. */
export default function Analytics() {
  useEffect(() => { void initAnalytics(); }, []);
  return null;
}
