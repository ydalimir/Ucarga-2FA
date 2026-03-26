

import Link from 'next/link';
import type { Trip } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin, Calendar, Truck, Milestone, RefreshCw, PauseCircle } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTrips } from '@/context/trips-context';
import { Button } from '../ui/button';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ActivityTripCardProps {
  trip: Trip;
}

const statusVariant: Record<Trip['status'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'En Progreso': 'default',
    'Completado': 'secondary',
    'Pendiente': 'destructive',
    'Asignado': 'default',
    'En Espera de Pago': 'default',
    'Pagado': 'default',
    'Pausado': 'outline',
}

export function ActivityTripCard({ trip }: ActivityTripCardProps) {
  const detailsUrl = `/trips/${trip.id}?role=empresa`;
  const { toggleTripStatus } = useTrips();
  const [isToggling, setIsToggling] = useState(false);
  
  // Robust date handling: Works with Firestore Timestamps and date strings.
  const createdAtDate = trip.createdAt ? new Date((trip.createdAt as any).seconds ? (trip.createdAt as any).toDate() : trip.createdAt) : new Date();

  const handleTogglePause = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to details page
    setIsToggling(true);
    await toggleTripStatus(trip.id, trip.status);
    setIsToggling(false);
  };

  const canBeToggled = trip.status === 'Pendiente' || trip.status === 'Pausado';


  return (
    <Card className="transition-all hover:shadow-md">
       <Link href={detailsUrl}>
        <CardHeader className="p-4 flex-row items-start justify-between">
          <div>
            <CardTitle className="text-base font-bold">{trip.shipmentId}</CardTitle>
            <CardDescription className="text-xs">
              Publicado {formatDistanceToNow(createdAtDate, { addSuffix: true, locale: es })}
            </CardDescription>
          </div>
          <Badge variant={statusVariant[trip.status]}>{trip.status}</Badge>
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{trip.origin}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary" />
            <span>{trip.destination}</span>
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 flex-shrink-0" />
                <span>{trip.truckType}</span>
            </div>
             {trip.distanceKm && (
                <div className="flex items-center gap-2">
                    <Milestone className="h-4 w-4 flex-shrink-0" />
                    <span>{trip.distanceKm.toFixed(0)} km</span>
                </div>
             )}
          </div>
           <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <Calendar className="h-4 w-4 flex-shrink-0" />
            <span>Carga: {trip.pickupDate ? format(new Date(trip.pickupDate), "PPP", { locale: es }) : 'Fecha no especificada'}</span>
          </div>
        </CardContent>
      </Link>
        {canBeToggled && (
             <div className="p-2 border-t bg-muted/50">
                 <Button onClick={handleTogglePause} disabled={isToggling} className="w-full" size="sm" variant={trip.status === 'Pausado' ? 'default' : 'secondary'}>
                     {isToggling ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                     ) : trip.status === 'Pausado' ? (
                        <RefreshCw className="mr-2 h-4 w-4" />
                     ) : (
                        <PauseCircle className="mr-2 h-4 w-4" />
                     )}
                     {trip.status === 'Pausado' ? 'Reanudar Publicación' : 'Pausar Publicación'}
                 </Button>
            </div>
        )}
    </Card>
  );
}
