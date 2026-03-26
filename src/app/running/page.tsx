

'use client';

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TripCard } from "@/components/trips/trip-card";
import { useTrips } from "@/context/trips-context";
import { PlusCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, Suspense, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trip } from "@/lib/types";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS_PER_PAGE = 10;

const PaginatedTripsList = ({ tripsToShow, emptyMessage, loading, role }: { tripsToShow: Trip[], emptyMessage: string, loading: boolean, role: string | null }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(tripsToShow.length / ITEMS_PER_PAGE);

    const paginatedTrips = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return tripsToShow.slice(startIndex, endIndex);
    }, [tripsToShow, currentPage]);

    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (tripsToShow.length === 0) {
      return (
         <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
                <p>{emptyMessage}</p>
            </CardContent>
         </Card>
      );
    }
    return (
        <div>
            <div className="space-y-4">
                {paginatedTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} role={role} />
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


function RunningTripsPageContent() {
  const { trips, loading: tripsLoading } = useTrips();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const [user, authLoading] = useAuthState(auth);

  const loading = tripsLoading || authLoading;

  const myTrips = useMemo(() => {
    if (!user) return [];
    
    if (role === 'empresa') {
        return trips.filter(trip => trip.creatorId === user.uid);
    } 
    if (role === 'transportista') {
        // Show trips assigned to the carrier
        return trips.filter(trip => trip.assignedCarrierId === user.uid);
    }
    return [];
  }, [trips, user, role]);


  const inProgressTrips = myTrips.filter(trip => trip.status !== 'Completado');
  const completedTrips = myTrips.filter(trip => trip.status === 'Completado');

  const { toast } = useToast();

  useEffect(() => {
    const created = searchParams.get('created');
    if (created === 'true') {
      toast({
        title: "Solicitud Creada",
        description: "La nueva solicitud de viaje ha sido creada exitosamente y guardada en la base de datos.",
        variant: 'default',
      });
      // Clean the URL
      const newUrl = role ? `/running?role=${role}` : '/running';
      window.history.replaceState(null, '', newUrl);
    }
  }, [searchParams, toast, role]);

  const TripsList = ({ tripsToShow }: { tripsToShow: Trip[] }) => {
    if (loading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      );
    }
    if (tripsToShow.length === 0) {
      return <p className="text-center text-muted-foreground pt-8">No hay viajes en esta categoría.</p>;
    }
    return (
      <div className="space-y-4">
        {tripsToShow.map(trip => (
          <TripCard key={trip.id} trip={trip} role={role} />
        ))}
      </div>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">Mis Viajes</h1>
        {role === 'empresa' && (
          <Button asChild>
            <Link href={`/running/new?role=${role || ''}`}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Crear Solicitud
            </Link>
          </Button>
        )}
      </div>
      <Tabs defaultValue="in-progress">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="in-progress">
            En Progreso ({!loading ? inProgressTrips.length : '...'})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completados ({!loading ? completedTrips.length : '...'})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="in-progress" className="mt-6">
          <TripsList tripsToShow={inProgressTrips} />
        </TabsContent>
        <TabsContent value="completed" className="mt-6">
           <PaginatedTripsList 
              tripsToShow={completedTrips} 
              emptyMessage="No tienes viajes completados." 
              loading={loading}
              role={role}
            />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function RunningTripsPage() {
    return (
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <RunningTripsPageContent />
        </Suspense>
    );
}
