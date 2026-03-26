
'use client';

import { FirebaseErrorListener } from '@/components/layout/firebase-error-listener';
import { Toaster } from '@/components/ui/toaster';
import { TripsProvider } from '@/context/trips-context';

export function FirebaseClientProvider({ children }: { children: React.ReactNode }) {
  return (
    <TripsProvider>
      <FirebaseErrorListener>
        {children}
      </FirebaseErrorListener>
      <Toaster />
    </TripsProvider>
  );
}
