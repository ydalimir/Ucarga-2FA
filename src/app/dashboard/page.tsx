
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CompanyDashboard } from '@/components/dashboard/company-dashboard';
import { CarrierDashboard } from '@/components/dashboard/carrier-dashboard';

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  if (role === 'transportista') {
    return <CarrierDashboard />;
  }

  // Default to company dashboard if role is 'empresa' or not specified
  return <CompanyDashboard />;
}

export default function DashboardPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <DashboardPageContent />
        </Suspense>
    );
}
