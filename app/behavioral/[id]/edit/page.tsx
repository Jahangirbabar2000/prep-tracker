'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function BehavioralEditPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="behavioral" basePath="/behavioral" backLabel="Behavioral" />;
}
