

import Link from 'next/link';
import type { Trip } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface TripCardProps {
  trip: Trip;
  role: string | null;
}

const statusVariant: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    'Pendiente': 'destructive',
    'Asignado': 'default',
    'En Progreso': 'default',
    'En Espera de Pago': 'outline',
    'Pagado': 'outline',
    'Completado': 'secondary',
}

export function TripCard({ trip, role }: TripCardProps) {
  const detailsUrl = `/trips/${trip.id}?role=${role || ''}`;
  
  const currentStatus = trip.status || 'Indefinido';
  const variant = statusVariant[currentStatus] || 'outline';

  return (
    <Link href={detailsUrl}>
      <Card className="transition-all hover:shadow-md hover:-translate-y-1">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between">
            <CardTitle className="text-base font-bold">{trip.shipmentId}</CardTitle>
            <Badge variant={variant}>{currentStatus}</Badge>
          </div>
           {trip.pickupDate && <p className="text-xs text-muted-foreground">{format(new Date(trip.pickupDate), "eeee, dd 'de' MMMM", { locale: es })}</p>}
        </CardHeader>
        <CardContent className="p-4 pt-0 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{trip.origin}</span>
            <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary" />
            <span>{trip.destination}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
