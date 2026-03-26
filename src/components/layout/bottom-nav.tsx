
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { LayoutDashboard, Truck, User, Wallet, LogOut, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { auth } from '@/lib/firebase';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"


const navItems = [
  { href: '/dashboard', label: 'Principal', icon: LayoutDashboard },
  { href: '/running', label: 'Mis Viajes', icon: Truck },
  { href: '/chats', label: 'Chats', icon: MessageSquare },
  { href: '/wallet', label: 'Billetera', icon: Wallet },
  { href: '/profile', label: 'Perfil', icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const role = searchParams.get('role');

  const handleLogout = async () => {
    await auth.signOut();
    router.push('/auth');
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 border-t bg-card md:hidden">
      <div className="grid grid-cols-6 h-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const href = `${item.href}?role=${role || 'transportista'}`;
          return (
            <Link key={item.href} href={href} className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
              <item.icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
              <span className={cn('text-xs', isActive ? 'font-bold text-primary' : 'text-muted-foreground')}>
                {item.label}
              </span>
            </Link>
          );
        })}
         <AlertDialog>
          <AlertDialogTrigger asChild>
              <button className="flex flex-1 flex-col items-center justify-center gap-1 text-center">
                <LogOut className={'h-5 w-5 text-muted-foreground'} />
                <span className={'text-xs text-muted-foreground'}>
                  Salir
                </span>
              </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Cerrar Sesión?</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Estás seguro de que quieres cerrar tu sesión?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleLogout}>Cerrar Sesión</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </nav>
  );
}
