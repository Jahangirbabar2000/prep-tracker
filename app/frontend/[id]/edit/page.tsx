'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function FrontendEditPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="frontend" basePath="/frontend" backLabel="Frontend" />;
}
