'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function DSADetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="dsa" basePath="/dsa" backLabel="DSA" />;
}
