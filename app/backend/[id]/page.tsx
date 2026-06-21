'use client';

import { useParams } from 'next/navigation';
import ProblemViewPage from '@/components/ProblemViewPage';

export default function BackendDetailPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemViewPage id={id} domain="python" basePath="/backend" backLabel="Backend" />;
}
