'use client';

import { useParams } from 'next/navigation';
import ProblemViewPage from '@/components/ProblemViewPage';

export default function AIDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemViewPage id={id} domain="ai" basePath="/ai" backLabel="AI" />;
}
