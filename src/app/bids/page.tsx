
'use client';

import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useTrips } from '@/context/trips-context';
import { useState, useEffect, Suspense, useMemo } from 'react';
import type { Bid } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BidCard } from '@/components/trips/bid-card';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const ITEMS_PER_PAGE = 10;

const PaginatedBidsList = ({ bids }: { bids: Bid[] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(bids.length / ITEMS_PER_PAGE);

    const paginatedBids = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return bids.slice(startIndex, endIndex);
    }, [bids, currentPage]);

    return (
        <div>
            <div className="space-y-4">
                {paginatedBids.map(bid => (
                    <BidCard key={bid.id} bid={bid} />
                ))}
            </div>
            {totalPages > 1 && (
                <div className="mt-6 flex justify-between items-center">
                    <Button 
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button 
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    );
};


function MyBidsPageContent() {
    const [user, authLoading] = useAuthState(auth);
    const { getBidsForCarrier, loading: tripsLoading } = useTrips();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = getBidsForCarrier(user.uid, (carrierBids) => {
            setBids(carrierBids);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [user, authLoading, getBidsForCarrier]);

    const loadingState = loading || tripsLoading || authLoading;

    if (loadingState) {
        return (
            <div className="container mx-auto p-4 md:p-6 space-y-4">
                <h1 className="text-3xl font-bold text-primary">Mis Ofertas</h1>
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="container mx-auto p-4 md:p-6 text-center">
                 <h1 className="text-3xl font-bold text-primary mb-4">Mis Ofertas</h1>
                 <p className="mb-4">Debes iniciar sesión para ver tus ofertas.</p>
                 <Button asChild>
                    <Link href="/auth">Iniciar Sesión</Link>
                 </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <h1 className="text-3xl font-bold text-primary mb-6">Mis Ofertas</h1>
            {bids.length > 0 ? (
                <PaginatedBidsList bids={bids} />
            ) : (
                <div className="text-center text-muted-foreground border rounded-lg p-12">
                    <p>No has realizado ninguna oferta todavía.</p>
                    <Button variant="link" asChild className="mt-2">
                        <Link href="/dashboard?role=transportista">Explorar cargas disponibles</Link>
                    </Button>
                </div>
            )}
        </div>
    );
}


export default function MyBidsPage() {
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <MyBidsPageContent />
        </Suspense>
    );
}
