
'use client';

import { useEffect, useState } from 'react';
import type { Trip, Bid } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useTrips } from '@/context/trips-context';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { Milestone } from 'lucide-react';
import { Badge } from '../ui/badge';

interface LoadCardProps {
  trip: Trip;
}

const biddingTypeLabels: Record<Trip['biddingType'], string> = {
  fixed: 'Precio Fijo',
  auction: 'Subasta',
  competition: 'Competencia',
};

export function LoadCard({ trip }: LoadCardProps) {
  const [user] = useAuthState(auth);
  const { getCarrierBidForTrip } = useTrips();
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [checkingBid, setCheckingBid] = useState(true);

  useEffect(() => {
    const checkForExistingBid = async () => {
      if (!user) {
        setCheckingBid(false);
        return;
      }
      setCheckingBid(true);
      const bid = await getCarrierBidForTrip(trip.id, user.uid);
      setExistingBid(bid);
      setCheckingBid(false);
    };

    checkForExistingBid();
  }, [trip.id, user, getCarrierBidForTrip]);
  

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Fecha inválida';
    }
    return new Intl.DateTimeFormat('es-MX', {
      weekday: 'short',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true,
    }).format(date);
  };

  const detailsUrl = `/trips/${trip.id}?role=transportista`;
  const bidUrl = `/trips/${trip.id}/bid?role=transportista`;
  const biddingTypeLabel = biddingTypeLabels[trip.biddingType] || 'Abierta';
  
  // Standardize badge variants
  const biddingTypeVariant: Record<Trip['biddingType'], 'default' | 'secondary' | 'destructive'> = {
    fixed: 'default',
    auction: 'default',
    competition: 'default',
  }

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="grid grid-cols-[1fr_auto] items-start gap-4">
          {/* Columna Izquierda: Detalles de la Ruta */}
          <div className="flex gap-4">
            {/* Línea de tiempo vertical */}
            <div className="flex flex-col items-center">
              <div className="h-4 w-4 rounded-full border-2 border-primary bg-background" />
              <div className="h-16 w-px flex-1 bg-border" />
              <div className="h-4 w-4 rounded-full border-2 border-primary bg-primary" />
            </div>
            
            {/* Origen y Destino */}
            <div className="flex flex-col justify-between">
              <div>
                <p className="font-semibold">{trip.origin}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(trip.pickupDate)}</p>
              </div>
              <div>
                <p className="font-semibold">{trip.destination}</p>
                <p className="text-xs text-muted-foreground">{formatDateTime(trip.deliveryDate)}</p>
              </div>
            </div>
          </div>
          
          {/* Columna Derecha: Precio */}
          <div className="text-right flex flex-col items-end gap-1">
            <p className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(trip.budget || 0)}
            </p>
             <p className="text-xs text-muted-foreground -mt-1">{trip.biddingType === 'fixed' ? '' : 'O MEJOR OFERTA'}</p>
             <Badge variant={biddingTypeVariant[trip.biddingType]} className="mt-1">{biddingTypeLabel}</Badge>
          </div>
        </div>
        
        {/* Detalles inferiores */}
        <div className="mt-3 flex items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            {trip.distanceKm && (
                <div className="flex items-center gap-1 font-bold text-foreground">
                    <Milestone className="h-4 w-4" />
                    <span>{trip.distanceKm.toFixed(0)} km</span>
                </div>
            )}
            <span>{trip.trailerType}</span>
            <span>{trip.totalWeight} {(trip.weightUnit || '').toUpperCase()}</span>
          </div>
        </div>
      </CardContent>
      <div className="grid grid-cols-2 gap-px border-t bg-gray-200">
        <Button variant="ghost" className="rounded-none bg-card py-3 text-base font-semibold hover:bg-muted" asChild>
          <Link href={detailsUrl}>Detalles</Link>
        </Button>
        <Button className="rounded-none py-3 text-base font-semibold" asChild>
            <Link href={existingBid ? `${bidUrl}&bid_id=${existingBid.id}` : bidUrl}>
              {existingBid ? "Ver Oferta" : "Ofertar"}
            </Link>
        </Button>
      </div>
    </Card>
  );
}
