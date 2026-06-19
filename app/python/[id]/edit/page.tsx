'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function PythonEditPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="python" basePath="/python" backLabel="Python" />;
}
