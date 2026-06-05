'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function FrontendDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="frontend" basePath="/frontend" backLabel="Frontend" />;
}
