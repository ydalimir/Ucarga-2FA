
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CarrierProfile } from '@/components/profile/carrier-profile';
import { CompanyProfile } from '@/components/profile/company-profile';
import { Loader2 } from 'lucide-react';


function ProfilePageContent() {
  const searchParams = useSearchParams();
  const role = searchParams.get('role');

  if (role === 'transportista') {
    return <CarrierProfile />;
  }
  
  if (role === 'empresa') {
    return <CompanyProfile />;
  }

  // Fallback while role is being determined, or if it's missing
  return (
    <div className="flex h-full flex-col items-center justify-center p-4 md:p-6 text-center">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p className="text-muted-foreground">Cargando perfil...</p>
    </div>
  );
}

export default function ProfilePage() {
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ProfilePageContent />
        </Suspense>
    );
}
