'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function AIEditPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="ai" basePath="/ai" backLabel="AI" />;
}
