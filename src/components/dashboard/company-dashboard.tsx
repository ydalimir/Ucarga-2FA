
'use client';

import { useSearchParams } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTrips } from '@/context/trips-context';
import { Skeleton } from '../ui/skeleton';
import type { Trip, Bid } from '@/lib/types';
import { ActivityTripCard } from '../trips/activity-trip-card';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import Link from 'next/link';
import { PlusCircle, FileText } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { BidCard } from '../trips/bid-card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '../ui/badge';
import { Filters, type FilterValues } from './filters';
import { normalizeLocationText } from '@/lib/search-utils';


const PendingBids = () => {
    const [user, authLoading] = useAuthState(auth);
    const { getBidsForCompany, trips, loading: tripsLoading } = useTrips();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            return;
        }

        const unsubscribe = getBidsForCompany(user.uid, (companyBids) => {
            setBids(companyBids);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [user, authLoading, getBidsForCompany]);

    const groupedBids = useMemo(() => {
        const actionableBids = bids.filter(bid => {
            const trip = trips.find(t => t.id === bid.tripId);
            return trip && trip.status !== 'Asignado' && trip.status !== 'Completado' && bid.status === 'pending';
        });

        return actionableBids.reduce((acc, bid) => {
            if (!acc[bid.tripId]) {
                acc[bid.tripId] = [];
            }
            acc[bid.tripId].push(bid);
            return acc;
        }, {} as Record<string, Bid[]>);
    }, [bids, trips]);


    if (loading || tripsLoading) {
        return (
             <div className="space-y-3">
                <Skeleton className="h-28 w-full" />
                <Skeleton className="h-28 w-full" />
            </div>
        )
    }
    
    if (Object.keys(groupedBids).length === 0) {
        return (
            <div className="rounded-lg border bg-card p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold">Sin ofertas pendientes</h3>
              <p className="text-muted-foreground mt-2">Cuando un transportista haga una oferta en uno de tus viajes, aparecerá aquí.</p>
            </div>
        )
    }
    
    return (
        <Accordion type="single" collapsible className="w-full space-y-3">
           {Object.entries(groupedBids).map(([tripId, tripBids]) => {
                const trip = trips.find(t => t.id === tripId);
                if (!trip) return null;
                return (
                    <AccordionItem value={tripId} key={tripId} className="border rounded-lg bg-card">
                        <AccordionTrigger className="p-4 hover:no-underline">
                           <div className="flex items-center justify-between w-full">
                                <div>
                                    <p className="font-bold text-base text-primary">{trip.shipmentId}</p>
                                    <p className="text-sm text-muted-foreground">{trip.originAddress} a {trip.destinationAddress}</p>
                                </div>
                                <Badge variant="secondary" className="mr-4">{tripBids.length} {tripBids.length === 1 ? 'Oferta' : 'Ofertas'}</Badge>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-4 pt-0">
                            <div className="space-y-3 border-t pt-4">
                                {tripBids.map(bid => (
                                    <BidCard key={bid.id} bid={bid} view="company" />
                                ))}
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
           })}
        </Accordion>
    )
}

const ITEMS_PER_PAGE = 10;

const TripsList = ({ tripsToShow, loading, filters }: { tripsToShow: Trip[], loading: boolean, filters: FilterValues }) => {
    const [currentPage, setCurrentPage] = useState(1);
    
    const filteredTrips = useMemo(() => {
        let updatedTrips = [...tripsToShow];

        if (filters.origin) {
            const normalizedQuery = normalizeLocationText(filters.origin);
            updatedTrips = updatedTrips.filter(trip => 
                normalizeLocationText(trip.originAddress).includes(normalizedQuery)
            );
        }
        if (filters.destination) {
             const normalizedQuery = normalizeLocationText(filters.destination);
            updatedTrips = updatedTrips.filter(trip => 
                normalizeLocationText(trip.destinationAddress).includes(normalizedQuery)
            );
        }
        if (filters.cargoType && filters.cargoType !== 'todos') {
            updatedTrips = updatedTrips.filter(trip => trip.cargoType === filters.cargoType);
        }
        if (filters.truckType && filters.truckType !== 'todos') {
            updatedTrips = updatedTrips.filter(trip => trip.truckType === filters.truckType);
        }
        if (filters.biddingType && filters.biddingType !== 'todos') {
            updatedTrips = updatedTrips.filter(trip => trip.biddingType === filters.biddingType);
        }
        if (filters.pickupDate) {
            const filterDate = new Date(filters.pickupDate);
            filterDate.setHours(0, 0, 0, 0);
            updatedTrips = updatedTrips.filter(trip => {
                const tripDate = new Date(trip.pickupDate);
                tripDate.setHours(0, 0, 0, 0);
                return tripDate.getTime() === filterDate.getTime();
            });
        }
        return updatedTrips;
    }, [tripsToShow, filters]);


    const totalPages = Math.ceil(filteredTrips.length / ITEMS_PER_PAGE);

    const paginatedTrips = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return filteredTrips.slice(startIndex, endIndex);
    }, [filteredTrips, currentPage]);

    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }

    return (
        <div className="space-y-4">
            {filteredTrips.length === 0 ? (
                <Card className="border-dashed border-2">
                    <CardContent className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground">
                        <div className="rounded-full bg-primary/10 p-4 mb-4">
                            <FileText className="h-8 w-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">Aún no hay actividades</h3>
                        <p className="max-w-sm mx-auto mb-6">No tienes actividades que coincidan con los criterios o aún no has creado ninguna.</p>
                        <Button asChild>
                            <Link href={`/running/new?role=empresa`}>
                                <PlusCircle className="mr-2 h-4 w-4" />
                                Crear mi primera carga
                            </Link>
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {paginatedTrips.map(trip => (
                        <ActivityTripCard key={trip.id} trip={trip} />
                    ))}
                </div>
            )}
            
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

const initialFilters: FilterValues = {
    origin: '',
    destination: '',
    cargoType: 'todos',
    pickupDate: null,
    biddingType: 'todos',
    truckType: 'todos',
};

export function CompanyDashboard() {
  const searchParams = useSearchParams();
  const { trips, loading: tripsLoading } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const role = searchParams.get('role');
  const [filters, setFilters] = useState<FilterValues>(initialFilters);

  const loading = tripsLoading || authLoading;

  const myTrips = useMemo(() => {
    if (!user) return [];
    return trips.filter(trip => trip.creatorId === user.uid);
  }, [trips, user]);

  const completedTrips = useMemo(() => myTrips.filter(trip => trip.status === 'Completado'), [myTrips]);

  return (
    <div className="flex-1 p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">Panel principal</h1>
        <Button asChild>
            <Link href={`/running/new?role=${role || ''}`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Solicitud
            </Link>
        </Button>
      </div>

      <Tabs defaultValue="tasks">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="tasks">Historial de actividades</TabsTrigger>
          <TabsTrigger value="running">Revisión de Ofertas</TabsTrigger>
          <TabsTrigger value="settlements">Servicios finalizados</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks" className="mt-4">
            <div className="space-y-4">
                <Filters filters={filters} onFilterChange={setFilters} isCompanyView={true}/>
                <TripsList tripsToShow={myTrips} loading={loading} filters={filters} />
            </div>
        </TabsContent>
        <TabsContent value="running" className="mt-4">
          <PendingBids />
        </TabsContent>
        <TabsContent value="settlements" className="mt-4">
             <div className="space-y-4">
                <Filters filters={filters} onFilterChange={setFilters} isCompanyView={true}/>
                <TripsList tripsToShow={completedTrips} loading={loading} filters={filters} />
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
