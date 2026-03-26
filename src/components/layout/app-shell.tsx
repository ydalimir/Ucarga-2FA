
"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Header } from '@/components/layout/header';
import { Sidebar } from '@/components/layout/sidebar';
import { BottomNav } from '@/components/layout/bottom-nav';
import { useIsMobile } from '@/hooks/use-mobile';
import { useUserRole } from '@/hooks/use-user-role';
import { Loader2 } from 'lucide-react';

function AppShellContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlRole = searchParams.get('role');
  
  const { role: dbRole, loading: roleLoading, user } = useUserRole();

  const [isClient, setIsClient] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    // Only perform role-based redirection if the user is logged in (dbRole is not null)
    if (!roleLoading && dbRole && urlRole && dbRole !== urlRole) {
      // If the role in the URL does not match the role in the database,
      // redirect to the correct dashboard.
      router.replace(`/dashboard?role=${dbRole}`);
    }
  }, [dbRole, urlRole, roleLoading, router]);

  const noNavRoutes = ['/', '/auth', '/terms', '/privacy', '/admin/verifier'];
  const isBidPage = pathname.startsWith('/trips/') && pathname.endsWith('/bid');
  const isChatPage = pathname.startsWith('/chat/');
  
  const isNoNavRoute = noNavRoutes.includes(pathname) || isBidPage || isChatPage;

  if (!isClient) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // If there's no nav, just render the children.
  if (isNoNavRoute) {
    return <>{children}</>;
  }

  // If loading or if user is logged out (and we are not on a public route), show a loader.
  // This prevents rendering the main layout during logout, avoiding redirection race conditions.
  if (roleLoading || !user) {
     return (
      <div className="flex h-screen items-center justify-center bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }
  
  const effectiveRole = dbRole || urlRole;

  // For carrier on mobile, show bottom nav instead of sidebar
  const showBottomNav = effectiveRole === 'transportista' && isMobile;
  // Show sidebar for company, or for carrier on desktop
  const showSidebar = !showBottomNav;

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {showSidebar && <Sidebar />}
      <div className="flex flex-col flex-1 min-w-0">
        {!showBottomNav && <Header />}
        <main className={`flex-1 overflow-y-auto ${showBottomNav ? 'pb-20' : ''}`}>
          {children}
        </main>
        {showBottomNav && <BottomNav />}
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
      <AppShellContent>{children}</AppShellContent>
    </Suspense>
  )
}
