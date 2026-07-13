'use client';

import { useParams } from 'next/navigation';
import ProblemViewPage from '@/components/ProblemViewPage';

export default function LLDDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemViewPage id={id} domain="lld" basePath="/lld" backLabel="Low-Level Design" />;
}
