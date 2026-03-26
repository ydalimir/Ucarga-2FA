
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LoadCard } from '@/components/trips/load-card';
import { Loader2 } from 'lucide-react';
import { useTrips } from '@/context/trips-context';
import { Skeleton } from '../ui/skeleton';
import { auth, db } from '@/lib/firebase';
import type { Bid, CarrierProfileData, Trip } from '@/lib/types';
import { BidCard } from '../trips/bid-card';
import { Filters, type FilterValues } from './filters';
import { normalizeLocationText } from '@/lib/search-utils';


const MyBids = () => {
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

    if (loading || tripsLoading) {
        return (
             <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
            </div>
        )
    }
    
    if (bids.length === 0) {
        return (
            <div className="rounded-lg border bg-white p-8 text-center">
              <p className="text-muted-foreground">Aún no has realizado ninguna oferta.</p>
            </div>
        )
    }
    
    return (
        <div className="space-y-3">
            {bids.map(bid => (
                <BidCard key={bid.id} bid={bid} />
            ))}
        </div>
    )
}

const initialFilters: FilterValues = {
    origin: '',
    destination: '',
    cargoType: 'todos',
    pickupDate: null,
    biddingType: 'todos',
    truckType: 'todos',
};

export function CarrierDashboard() {
  const { trips, loading } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<CarrierProfileData | null>(null);
  const [filters, setFilters] = useState<FilterValues>(initialFilters);

  useEffect(() => {
      if (user) {
          const unsub = onSnapshot(doc(db, 'users', user.uid), (doc) => {
              if (doc.exists()) {
                  setUserData(doc.data() as CarrierProfileData);
              }
          });
          return () => unsub();
      }
  }, [user]);

  const availableLoads = useMemo(() => {
    let filteredTrips = trips.filter(trip => trip.status === 'Pendiente' );

    // Apply text filters for location
    if (filters.origin) {
        const normalizedQuery = normalizeLocationText(filters.origin);
        filteredTrips = filteredTrips.filter(trip => 
            normalizeLocationText(trip.originAddress).includes(normalizedQuery)
        );
    }
    if (filters.destination) {
        const normalizedQuery = normalizeLocationText(filters.destination);
        filteredTrips = filteredTrips.filter(trip => 
            normalizeLocationText(trip.destinationAddress).includes(normalizedQuery)
        );
    }

    // Apply select filters
    if (filters.cargoType && filters.cargoType !== 'todos') {
        filteredTrips = filteredTrips.filter(trip => trip.cargoType === filters.cargoType);
    }
    if (filters.biddingType && filters.biddingType !== 'todos') {
        filteredTrips = filteredTrips.filter(trip => trip.biddingType === filters.biddingType);
    }
    if (filters.truckType && filters.truckType !== 'todos') {
        filteredTrips = filteredTrips.filter(trip => trip.truckType === filters.truckType);
    }

    // Apply date filter
    if (filters.pickupDate) {
        const filterDate = new Date(filters.pickupDate);
        filterDate.setHours(0, 0, 0, 0); // Normalize filter date
        filteredTrips = filteredTrips.filter(trip => {
            const tripDate = new Date(trip.pickupDate);
            tripDate.setHours(0, 0, 0, 0); // Normalize trip date
            return tripDate.getTime() === filterDate.getTime();
        });
    }

    return filteredTrips;
  }, [trips, filters]);
  
  const isLoading = loading || authLoading;

  return (
      <div className="flex-1 bg-gray-50/50 p-2 md:p-4">
            <div className="px-2 mb-6">
                <h1 className="text-2xl font-bold">Reservar Cargas</h1>
                <p className="text-muted-foreground">Encuentra y filtra las cargas disponibles para transportar.</p>
            </div>
          
           <Tabs defaultValue="all" className="w-full">
              <div className="px-2">
                  <TabsList className="mt-4 grid w-full grid-cols-2">
                      <TabsTrigger value="all">Cargas Disponibles ({!isLoading ? availableLoads.length : '...'})</TabsTrigger>
                      <TabsTrigger value="bids">Mis Ofertas</TabsTrigger>
                  </TabsList>
              </div>
              <TabsContent value="all" className="mt-4 space-y-6">
                  <Filters filters={filters} onFilterChange={setFilters} />
                  {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-48 w-full" />
                        <Skeleton className="h-48 w-full" />
                    </div>
                  ) : availableLoads.length > 0 ? (
                    <div className="space-y-3">
                        {availableLoads.map(trip => (
                            <LoadCard key={trip.id} trip={trip} />
                        ))}
                    </div>
                  ) : (
                     <div className="rounded-lg border bg-white p-8 text-center">
                      <p className="text-muted-foreground">No hay cargas que coincidan con tus filtros.</p>
                  </div>
                  )}
              </TabsContent>
              <TabsContent value="bids" className="mt-4">
                  <MyBids />
              </TabsContent>
          </Tabs>
      </div>
  );
}
