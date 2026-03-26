

'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowLeft, User, Truck, Star, CheckCircle, Handshake, Mail, Phone, Calendar, Shield, Building, FileText, AlertTriangle, MapPin, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrips } from '@/context/trips-context';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import type { Bid, Trip, CarrierProfileData, Vehicle } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { TripCard } from '@/components/trips/trip-card';


// Componente para manejar la lógica de aceptar la oferta
function AcceptOfferCard({ tripId, carrierId }: { tripId: string, carrierId: string }) {
    const { getCarrierBidForTrip, getTripById, acceptBid } = useTrips();
    const router = useRouter();
    const [bid, setBid] = useState<Bid | null>(null);
    const [trip, setTrip] = useState<Trip | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            if (!tripId || !carrierId) {
                setLoading(false);
                return;
            }
            try {
                const [bidData, tripData] = await Promise.all([
                    getCarrierBidForTrip(tripId, carrierId),
                    getTripById(tripId)
                ]);
                setBid(bidData);
                setTrip(tripData || null);
            } catch (error) {
                console.error("Error fetching bid/trip data for card:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [tripId, carrierId, getCarrierBidForTrip, getTripById]);

    const handleAcceptBid = async () => {
        if (!bid || !trip) return;

        if (confirm(`¿Seguro que quieres aceptar la oferta por $${bid.amount.toLocaleString()}?`)) {
            try {
                await acceptBid(trip.id, bid);
                router.push(`/chat/${trip.id}/${carrierId}`);
            } catch (error) {
                console.error("Error accepting bid:", error);
                alert("No se pudo aceptar la oferta.");
            }
        }
    };
    
    if (loading) {
        return <Skeleton className="h-24 w-full mb-8" />
    }

    const canAcceptOffer = bid && trip && trip.status !== 'Completado' && trip.status !== 'Asignado';

    if (!canAcceptOffer) {
        return null;
    }

    return (
        <Card className="mb-8 bg-primary/5 border-primary">
            <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                    <p className="font-semibold">Oferta para el viaje <span className="text-primary">{trip.shipmentId}</span></p>
                    <p className="text-2xl font-bold">${bid.amount.toLocaleString()} MXN</p>
                </div>
                <Button onClick={handleAcceptBid}>
                    <Handshake className="mr-2 h-4 w-4" />
                    Aceptar Oferta y Asignar Viaje
                </Button>
            </CardContent>
        </Card>
    );
}

function PublicCarrierProfilePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { trips, getUserProfile } = useTrips();
    
    const carrierId = typeof params.id === 'string' ? params.id : '';
    const tripId = searchParams.get('tripId');

    const [userData, setUserData] = useState<CarrierProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const completedTrips = useMemo(() => {
        if (!carrierId) return [];
        return trips.filter(trip => trip.assignedCarrierId === carrierId && trip.status === 'Completado');
    }, [trips, carrierId]);

    const fetchPageData = useCallback(async () => {
        if (!carrierId) {
            setLoading(false);
            setError('ID de transportista no válido.');
            return;
        }

        setLoading(true);
        try {
            const userProfile = await getUserProfile(carrierId);
            if (userProfile) {
                setUserData(userProfile);
            } else {
                 setError('No se pudo encontrar el perfil del transportista.');
            }
        } catch (error) {
            console.error("Error fetching page data:", error);
            setError('Ocurrió un error al cargar los datos.');
        } finally {
            setLoading(false);
        }
    }, [carrierId, getUserProfile]);


    useEffect(() => {
        fetchPageData();
    }, [fetchPageData]);


    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    if (error || !userData) {
        return (
            <div className="flex h-screen flex-col items-center justify-center text-center p-4">
                <p className="mb-4 text-lg">{error || 'No se pudo encontrar el perfil del transportista.'}</p>
                <Button onClick={() => router.back()}>Volver</Button>
            </div>
        );
    }
    
    // Make sure to display fullName (for carriers) not companyName
    const profileName = userData.fullName || "Transportista";

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver
                </Button>
            </div>

            {tripId && <AcceptOfferCard tripId={tripId} carrierId={carrierId} />}

            <div className="flex flex-col items-center gap-4 mb-8">
                <Avatar className="h-24 w-24 border-4 border-primary">
                    <AvatarImage src={userData.photoURL} alt={profileName} />
                    <AvatarFallback className="text-3xl bg-secondary">{profileName?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                    <h1 className="text-2xl font-bold">{profileName}</h1>
                    {userData.description && (
                        <p className="mt-2 text-muted-foreground max-w-2xl">{userData.description}</p>
                    )}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userData.rating?.toFixed(1) || 'N/A'}</div>
                        <p className="text-xs text-muted-foreground">Basado en {userData.ratingCount || 0} calificaciones</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Viajes Completados</CardTitle>
                        <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{completedTrips.length}</div>
                        <p className="text-xs text-muted-foreground">Total en la plataforma</p>
                    </CardContent>
                </Card>
            </div>

            <div className="space-y-6">
               <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Star className="h-5 w-5 text-primary" /> Calificaciones y Reseñas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                      {/* This section would be populated with actual review data */}
                      <div className="border-b pb-4">
                          <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < 5 ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />)}
                              </div>
                              <p className="font-semibold text-sm">Empresa Logística ABC</p>
                          </div>
                          <p className="text-sm text-muted-foreground">"Excelente servicio, muy profesional y siempre a tiempo. Totalmente recomendado."</p>
                      </div>
                      <div className="border-b pb-4">
                          <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center">
                                  {[...Array(5)].map((_, i) => <Star key={i} className={`h-4 w-4 ${i < 4 ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`} />)}
                              </div>
                              <p className="font-semibold text-sm">Distribuidora del Sureste</p>
                          </div>
                           <p className="text-sm text-muted-foreground">"Buen servicio en general, hubo un pequeño retraso pero la comunicación fue buena."</p>
                      </div>
                       <p className="text-xs text-center text-muted-foreground pt-2">Mostrando las reseñas más recientes.</p>
                  </CardContent>
               </Card>
            </div>
        </div>
    );
}

export default function PublicCarrierProfilePageWrapper() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <PublicCarrierProfilePage />
        </Suspense>
    )
}
