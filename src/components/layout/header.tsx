'use client'

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Loader2, Wallet } from 'lucide-react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import type { UserRole } from '@/hooks/use-user-role';
import { useRouter } from 'next/navigation';

type UserData = {
  fullName?: string;
  companyName?: string;
  role: UserRole;
  photoURL?: string;
  tokenBalance?: number;
};


export function Header() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    if (user) {
      setUserLoading(true);
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as UserData);
        }
        setUserLoading(false);
      });
      return () => unsubscribe();
    } else if (!authLoading) {
      setUserLoading(false);
    }
  }, [user, authLoading]);
  
  const handleLogout = async () => {
    await auth.signOut();
    router.push('/auth');
  };

  const profileHref = role ? `/profile?role=${role}` : '/profile';
  const isLoading = authLoading || userLoading;
  const displayName = userData?.role === 'empresa' ? userData?.companyName : userData?.fullName;
  const fallbackChar = displayName ? displayName.charAt(0).toUpperCase() : 'U';

  if (isLoading) {
    return (
       <header className="flex h-16 items-center justify-end border-b bg-card px-6">
        <Loader2 className="h-6 w-6 animate-spin" />
      </header>
    )
  }

  return (
    <header className="flex h-16 items-center justify-end border-b bg-card px-6 gap-4">
        {userData?.role === 'transportista' && (
             <Link href="/wallet?role=transportista" className="flex items-center gap-2 text-sm font-semibold text-primary hover:bg-muted p-2 rounded-md">
                <Wallet className="h-5 w-5" />
                <span>{userData.tokenBalance ?? 0} Tokens</span>
            </Link>
        )}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-2 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring">
            <Avatar className="h-8 w-8">
                <AvatarImage src={userData?.photoURL} alt={displayName || 'Usuario'} />
                <AvatarFallback>{fallbackChar}</AvatarFallback>
            </Avatar>
          <span className="font-medium">{displayName || 'Usuario'}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mi Cuenta</DropdownMenuLabel>
          <DropdownMenuSeparator />
           <Link href={profileHref}>
            <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
            </DropdownMenuItem>
          </Link>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Cerrar Sesión</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
