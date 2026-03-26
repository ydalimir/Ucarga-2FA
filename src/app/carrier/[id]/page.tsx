

'use client';

import { Suspense, useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, ArrowLeft, User, Truck, Star, CheckCircle, Handshake, Mail, Phone, Calendar, Shield, Building, FileText, AlertTriangle, MapPin, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTrips } from '@/context/trips-context';
import { errorEmitter } from '@/lib/error-emitter';
import { FirestorePermissionError } from '@/lib/errors';
import type { Bid, Trip, CarrierProfileData, Vehicle, Rating } from '@/lib/types';
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

const ReviewCard = ({ rating, companyName }: { rating: Rating; companyName: string }) => {
    return (
        <div className="border-b pb-4">
            <div className="flex items-center gap-2 mb-1">
                <div className="flex items-center">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`h-4 w-4 ${i < rating.stars ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground'}`}
                        />
                    ))}
                </div>
                <p className="font-semibold text-sm">{companyName}</p>
            </div>
            {rating.comment && (
                <p className="text-sm text-muted-foreground">"{rating.comment}"</p>
            )}
        </div>
    );
};


function PublicCarrierProfilePage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const { trips, getUserProfile, getRatingsForCarrier } = useTrips();
    
    const carrierId = typeof params.id === 'string' ? params.id : '';
    const tripId = searchParams.get('tripId');

    const [userData, setUserData] = useState<CarrierProfileData | null>(null);
    const [ratings, setRatings] = useState<Rating[]>([]);
    const [companyNames, setCompanyNames] = useState<Record<string, string>>({});
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
            // Subscribe to user profile updates in real-time
            const userDocRef = doc(db, 'users', carrierId);
            const unsubscribeUser = onSnapshot(userDocRef, (doc) => {
                if (doc.exists()) {
                    setUserData(doc.data() as CarrierProfileData);
                } else {
                    setError('No se pudo encontrar el perfil del transportista.');
                    setUserData(null);
                }
            }, (err) => {
                console.error("Error fetching user profile:", err);
                setError('Ocurrió un error al cargar los datos del perfil.');
            });

            // Subscribe to ratings updates in real-time
            const unsubscribeRatings = getRatingsForCarrier(carrierId, async (newRatings) => {
                setRatings(newRatings);
                
                // Fetch company names for the new ratings
                const newCompanyIds = newRatings
                    .map(r => r.companyId)
                    .filter(id => !companyNames[id]);
                
                if (newCompanyIds.length > 0) {
                    const uniqueCompanyIds = [...new Set(newCompanyIds)];
                    const companyProfiles = await Promise.all(uniqueCompanyIds.map(id => getUserProfile(id)));
                    
                    const namesMap: Record<string, string> = {};
                    companyProfiles.forEach(profile => {
                        if (profile) {
                            namesMap[profile.uid] = profile.companyName || 'Empresa Anónima';
                        }
                    });
                    
                    setCompanyNames(prev => ({ ...prev, ...namesMap }));
                }
            });
            
            setLoading(false);

            return () => {
                unsubscribeUser();
                unsubscribeRatings();
            };

        } catch (error) {
            console.error("Error setting up subscriptions:", error);
            setError('Ocurrió un error al cargar los datos.');
            setLoading(false);
        }
    }, [carrierId, getUserProfile, getRatingsForCarrier, companyNames]);


    useEffect(() => {
        const unsubscribePromise = fetchPageData();
        return () => {
            unsubscribePromise.then(unsubscribe => {
                if (unsubscribe) unsubscribe();
            });
        };
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
                        <CardTitle className="text-sm font-medium">Calificaciones Totales</CardTitle>
                        <Star className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{userData.ratingCount || 0}</div>
                        <p className="text-xs text-muted-foreground">Promedio de estrellas</p>
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
                      {ratings.length > 0 ? (
                        <>
                            {ratings.slice(0, 2).map((rating) => (
                                <ReviewCard 
                                    key={rating.id} 
                                    rating={rating}
                                    companyName={companyNames[rating.companyId] || 'Cargando...'}
                                />
                            ))}
                            {ratings.length > 2 && (
                                <p className="text-xs text-center text-muted-foreground pt-2">Mostrando las 2 reseñas más recientes de {ratings.length}.</p>
                            )}
                        </>
                      ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>Este transportista aún no tiene calificaciones.</p>
                        </div>
                      )}
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

    