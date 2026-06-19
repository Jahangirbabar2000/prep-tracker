'use client';

import { useParams } from 'next/navigation';
import ProblemViewPage from '@/components/ProblemViewPage';

export default function DSADetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemViewPage id={id} domain="dsa" basePath="/dsa" backLabel="DSA" />;
}
