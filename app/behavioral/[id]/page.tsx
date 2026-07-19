'use client';

import { useParams } from 'next/navigation';
import ProblemViewPage from '@/components/ProblemViewPage';

export default function BehavioralDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemViewPage id={id} domain="behavioral" basePath="/behavioral" backLabel="Behavioral" />;
}
