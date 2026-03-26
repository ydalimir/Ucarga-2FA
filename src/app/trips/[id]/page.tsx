
'use client';

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TripDetails } from "@/components/trips/trip-details";
import { TripDetailsCarrier } from "@/components/trips/trip-details-carrier";
import { notFound, useSearchParams, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useTrips } from "@/context/trips-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Suspense } from "react";

function TripDetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { trips, loading } = useTrips();
  
  const id = typeof params.id === 'string' ? params.id : '';
  const role = searchParams.get('role');
  
  const trip = trips.find(t => t.id === id);

  if (loading) {
    return (
        <div className="container mx-auto p-4 md:p-6 space-y-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  if (!trip) {
    return notFound();
  }
  
  if (role === 'transportista') {
    return <TripDetailsCarrier trip={trip} />
  }

  const backUrl = `/running?role=${role || 'empresa'}`;

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">{trip.shipmentId}</h1>
        </div>
      </div>
      <TripDetails trip={trip} />
    </div>
  );
}

export default function TripDetailPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <TripDetailPageContent />
        </Suspense>
    );
}
