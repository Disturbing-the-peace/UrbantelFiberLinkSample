'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to analytics page
    router.replace('/dashboard/analytics');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#00A191] mb-2"></div>
        <div className="text-sm text-[#1C1C2E]">Loading dashboard...</div>
      </div>
    </div>
  );
}
