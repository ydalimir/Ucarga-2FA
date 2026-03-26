'use client'

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Search, Bell, BarChart2, Truck, Building, Sailboat, FileText, Gavel, User, Wrench, Package, UserCog, Loader2, Wallet, MessageSquare } from "lucide-react";
import { useUserRole } from "@/hooks/use-user-role";

const navItemsBase = [
    { href: '/dashboard', label: 'Panel Principal', icon: LayoutDashboard },
];

const navItemsEmpresa = [
    { href: '/search', label: 'Buscar Embarque', icon: Search },
    { href: '/running', label: 'Mis Viajes', icon: Truck },
    { href: '/reports', label: 'Reportes', icon: BarChart2 },
];

const navItemsTransportista = [
    { href: '/running', label: 'Mis Viajes', icon: Truck },
    { href: '/bids', label: 'Mis Ofertas', icon: Gavel },
    { href: '/wallet', label: 'Billetera', icon: Wallet },
    { href: '/profile/edit-carrier', label: 'Editar Perfil', icon: UserCog },
    { href: '/profile/edit', tab: 'drivers', label: 'Conductores', icon: User },
    { href: '/profile/edit', tab: 'vehicles', label: 'Unidades', icon: Truck },
    { href: '/profile/edit', tab: 'trailers', label: 'Aditamento', icon: Package },
];

export function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { role, loading } = useUserRole();
    const currentTab = searchParams.get('tab');

    let navItems: (typeof navItemsBase[0] & { tab?: string })[] = [...navItemsBase];
    if (role === 'empresa') {
        navItems = [...navItems, ...navItemsEmpresa];
    } else if (role === 'transportista') {
        navItems = [...navItems, ...navItemsTransportista];
    }

    const roleIcon = role === 'empresa' ? <Building/> : <User/>;
    const roleText = role === 'empresa' ? 'Empresa' : 'Transportista';
    const dashboardHref = role ? `/dashboard?role=${role}` : '/dashboard';

    return (
        <aside className="w-64 flex-col border-r bg-card hidden md:flex">
            <div className="h-16 flex items-center justify-center border-b gap-2">
                 <Sailboat className="h-7 w-7 text-primary"/>
                 <Link href={dashboardHref} className="font-bold text-2xl text-primary">UCarga</Link>
            </div>
            {loading ? (
                <div className="p-4 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin" />
                </div>
            ) : role && (
                <div className="p-4 flex items-center gap-3 bg-muted/50 border-b">
                    {roleIcon}
                    <span className="font-semibold">{roleText}</span>
                </div>
            )}
            <nav className="flex-1 p-4 space-y-2">
                {navItems.map((item) => {
                    const isSimpleActive = pathname === item.href && !item.tab && !currentTab;
                    const isTabActive = pathname === item.href && item.tab && currentTab === item.tab;
                    const isActive = isSimpleActive || isTabActive;
                    
                    const params = new URLSearchParams();
                    if (role) params.set('role', role);
                    if (item.tab) params.set('tab', item.tab);
                    const href = `${item.href}?${params.toString()}`;
                    
                    return (
                        <Link
                            key={item.label}
                            href={href}
                            className={cn(
                                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-muted",
                                isActive ? "bg-primary text-primary-foreground" : "text-card-foreground"
                            )}
                        >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                        </Link>
                    )
                })}
            </nav>
        </aside>
    )
}
