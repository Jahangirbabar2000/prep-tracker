'use client';

import { useParams } from 'next/navigation';
import ProblemViewPage from '@/components/ProblemViewPage';

export default function FrontendDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemViewPage id={id} domain="frontend" basePath="/frontend" backLabel="Frontend" />;
}
