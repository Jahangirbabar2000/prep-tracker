'use client';

import { useParams } from 'next/navigation';
import ProblemDetailView from '@/components/ProblemDetailView';

export default function SystemDesignEditPage() {
  const { id } = useParams<{ id: string }>();
  return <ProblemDetailView id={id} domain="system_design" basePath="/system-design" backLabel="System Design" />;
}
