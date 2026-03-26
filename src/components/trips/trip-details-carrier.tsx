

'use client';

import { useEffect, useState, useCallback } from 'react';
import type { Trip, Bid, ChatMessage, CarrierProfileData, Driver, Vehicle, Trailer } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Bookmark, Share2, Banknote, Headset, FileText, Zap, MapPin, Calendar, Truck, Weight, Milestone, Clock, CreditCard, Package, Edit, Trash2, CheckCircle, ShieldCheck, Box, Scaling, ClipboardList, HardHat, Phone, ClipboardSignature, Gavel, User, X, DollarSign, Loader2, Camera, MessageSquare, Play, Flag, Archive, Copy, AlertCircle, Wrench, Wallet } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { TripInfoSection } from './trip-info-section';
import { useTrips } from '@/context/trips-context';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { Skeleton } from '../ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useRouter, useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps-config';
import { Badge } from '../ui/badge';
import { doc, getDoc } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatNumber } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from "@/lib/utils"

const fleetSelectionSchema = z.object({
  selectedDriverId: z.string().min(1, 'Debes seleccionar un conductor.'),
  selectedVehicleId: z.string().min(1, 'Debes seleccionar una unidad.'),
  selectedTrailerId: z.string().min(1, 'Debes seleccionar un aditamento.'),
});
type FleetSelectionFormValues = z.infer<typeof fleetSelectionSchema>;


const libraries: ("places")[] = ['places'];
const mapContainerStyle = {
  height: '300px',
  width: '100%',
  borderRadius: '0.5rem'
};
const mapOptions = {
    streetViewControl: true,
    mapTypeControl: true,
    zoomControl: true,
};


interface TripDetailsCarrierProps {
  trip: Trip;
}


const ChatButtonWithBadge = ({ tripId, participantId }: { tripId: string, participantId: string }) => {
    const { getUnreadMessagesCountForCarrier } = useTrips();
    const [unreadCount, setUnreadCount] = useState(0);
    const [user] = useAuthState(auth);

    useEffect(() => {
        if (tripId && participantId && user) {
            const unsubscribe = getUnreadMessagesCountForCarrier(tripId, participantId, setUnreadCount);
            return () => unsubscribe();
        }
    }, [tripId, participantId, getUnreadMessagesCountForCarrier, user]);

    const chatUrl = `/chat/${tripId}/${participantId}`;

    return (
        <Button size="lg" className="w-full relative" asChild>
            <Link href={chatUrl}>
                <MessageSquare className="mr-2 h-4 w-4" /> Chat con Empresa
                {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 rounded-full h-5 w-5 p-0 justify-center">
                        {unreadCount}
                    </Badge>
                )}
            </Link>
        </Button>
    )
}

function AcceptTripDialog({ trip, carrierData, children }: { trip: Trip, carrierData: CarrierProfileData | null, children: React.ReactNode }) {
    const { addBid } = useTrips();
    const { toast } = useToast();
    const [user] = useAuthState(auth);
    const [open, setOpen] = useState(false);
    const router = useRouter();
    
    const form = useForm<FleetSelectionFormValues>({
        resolver: zodResolver(fleetSelectionSchema),
        defaultValues: { selectedDriverId: '', selectedVehicleId: '', selectedTrailerId: '' }
    });
    
    if (!user || !carrierData) return null;

    const onSubmit = async (data: FleetSelectionFormValues) => {
        const driver = carrierData.drivers?.find(d => d.id === data.selectedDriverId);
        const vehicle = carrierData.vehicles?.find(v => v.id === data.selectedVehicleId);
        const trailer = carrierData.trailers?.find(t => t.id === data.selectedTrailerId);

        const bidPayload = {
            amount: trip.budget, // For fixed price, amount is the budget
            selectedDriverId: data.selectedDriverId,
            selectedVehicleId: data.selectedVehicleId,
            selectedTrailerId: data.selectedTrailerId,
            selectedDriverName: driver?.name || 'N/A',
            selectedVehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'N/A',
            selectedTrailerInfo: trailer ? `${trailer.type} - ${trailer.length}` : 'N/A',
        };
        
        try {
            await addBid(trip.id, user.uid, carrierData.fullName || user.displayName || "Transportista Anónimo", carrierData.photoURL, bidPayload);
            toast({ title: '¡Oferta de Precio Fijo Enviada!', description: `Tu oferta para el viaje ${trip.shipmentId} ha sido enviada a la empresa para su asignación final.` });
            setOpen(false);
            form.reset();
            router.push('/bids?role=transportista');
        } catch (error) {
            console.error("Error accepting trip:", error);
            toast({ title: 'Error', description: 'No se pudo enviar tu oferta. Inténtalo de nuevo.', variant: 'destructive' });
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirmar Equipo para Viaje de Precio Fijo</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    Estás a punto de ofertar por este viaje al precio fijo de ${trip.budget.toLocaleString()}. 
                    La empresa revisará tu oferta y te asignará el viaje si es aprobada. Por favor, selecciona el equipo que utilizarás.
                </p>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                        <FormField control={form.control} name="selectedDriverId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Conductor</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige un conductor..." /></SelectTrigger></FormControl>
                                    <SelectContent>{carrierData.drivers?.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="selectedVehicleId" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Unidad (Camión)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige una unidad..." /></SelectTrigger></FormControl>
                                    <SelectContent>{carrierData.vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="selectedTrailerId" render={({ field }) => (
                           <FormItem>
                                <FormLabel>Aditamento</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige un aditamento..." /></SelectTrigger></FormControl>
                                    <SelectContent>{carrierData.trailers?.map(t => <SelectItem key={t.id} value={t.id}>{t.type} - {t.length}</SelectItem>)}</SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <DialogFooter className="pt-4">
                            <DialogClose asChild><Button type="button" variant="ghost">Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Enviar Oferta
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export function TripDetailsCarrier({ trip }: TripDetailsCarrierProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = searchParams.get('role');
  const { getCarrierBidForTrip, deleteBid, startTrip, finishTrip, confirmPaymentAndCompleteTrip, getUserProfile } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [carrierData, setCarrierData] = useState<CarrierProfileData | null>(null);
  const [checkingBid, setCheckingBid] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const { toast } = useToast();

  const { isLoaded } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const onMapLoad = useCallback((map: google.maps.Map) => {
    if (trip.originCoords && trip.destinationCoords) {
      const bounds = new window.google.maps.LatLngBounds();
      bounds.extend(new window.google.maps.LatLng(trip.originCoords.lat, trip.originCoords.lng));
      bounds.extend(new window.google.maps.LatLng(trip.destinationCoords.lat, trip.destinationCoords.lng));
      map.fitBounds(bounds);
    }
  }, [trip.originCoords, trip.destinationCoords]);


  const checkForExistingBid = useCallback(async () => {
    if (!user) {
      setCheckingBid(false);
      return;
    };
    setCheckingBid(true);
    const [bid, profile] = await Promise.all([
      getCarrierBidForTrip(trip.id, user.uid),
      getUserProfile(user.uid)
    ]);
    setExistingBid(bid);
    setCarrierData(profile as CarrierProfileData | null);
    setCheckingBid(false);
  }, [user, trip.id, getCarrierBidForTrip, getUserProfile]);

  useEffect(() => {
    checkForExistingBid();
  }, [checkForExistingBid]);

  const bidUrl = `/trips/${trip.id}/bid?role=transportista${existingBid ? `&bid_id=${existingBid.id}` : ''}`;

  const handleDeleteBid = async () => {
    if (!existingBid) return;
    setIsActionLoading(true);
    try {
      await deleteBid(trip.id, existingBid.id);
      toast({ title: 'Oferta eliminada', description: 'Tu oferta para este viaje ha sido eliminada.' });
      // Use window.location.href for a full page reload to prevent state issues.
      // Redirect to the bids page as it's a more logical destination.
      window.location.href = `/bids?role=transportista&deleted_bid=true`;
    } catch (error) {
      toast({ title: 'Error', description: 'No se pudo eliminar tu oferta.', variant: 'destructive' });
    } finally {
        setIsActionLoading(false);
    }
  };

  const handleStartTrip = async () => {
    setIsActionLoading(true);
    await startTrip(trip.id);
    toast({ title: "Viaje Iniciado", description: "El estado del viaje ha sido actualizado a 'En Progreso'." });
    // No need to set loading to false, as the component will re-render with the new status
  };
  
  const handleFinishTrip = async () => {
    setIsActionLoading(true);
    await finishTrip(trip.id);
    toast({ title: "Viaje Finalizado", description: "El estado del viaje ha sido actualizado. Esperando pago de la empresa." });
  };

  const handleConfirmPayment = async () => {
    setIsActionLoading(true);
    await confirmPaymentAndCompleteTrip(trip.id);
    toast({ title: "Pago Confirmado", description: "El viaje ha sido marcado como completado." });
  }
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "PPP, p", { locale: es });
  }

  const getBiddingTypeLabel = (type: 'fixed' | 'auction' | 'competition') => {
    const labels = {
        'fixed': 'Precio Fijo',
        'auction': 'Subasta (Ofertas menores o iguales)',
        'competition': 'Competencia (Ofertas abiertas)'
    };
    if (type === 'fixed') {
        return 'Precio Fijo';
    }
    return labels[type];
  }
  
  const getPaymentTimingLabel = (timing: 'inmediato' | 'contra entrega' | 'credito') => {
    const labels = {
        'inmediato': 'Pago Inmediato',
        'contra entrega': 'Pago Contra Entrega',
        'credito': 'Pago a Crédito'
    };
    return labels[timing];
  }

  const getPaymentMethodLabel = () => {
    if (trip.paymentMethod === 'otros' && trip.otherPaymentMethod) {
        return `Otros: ${trip.otherPaymentMethod}`;
    }
    const labels = {
        transferencia: 'Transferencia',
        efectivo: 'Efectivo',
        credito: 'Crédito',
        cheque: 'Cheque',
        otros: 'Otros'
    };
    return labels[trip.paymentMethod];
  }
  
  const getCargoTypeLabel = () => {
    if (!trip.cargoType) return 'N/A';
    return trip.cargoType;
  }
  
   const getPackagingTypeLabel = () => {
    if (!trip.packagingType) return 'No especificado';
    if (trip.packagingType === 'Otro' && trip.otherPackagingType) {
        return `Otros: ${trip.otherPackagingType}`;
    }
    return trip.packagingType;
  }

  const getLicenseTypeLabel = (type?: 'B' | 'C' | 'E') => {
    if (!type) return 'No especificada';
    const labels = {
        B: 'Tipo "B"',
        C: 'Tipo "C" (Materiales peligrosos)',
        E: 'Tipo "E" (Doble remolque)'
    };
    return labels[type];
  }

  const isTripAssignedToMe = trip.status === 'Asignado' && trip.assignedCarrierId === user?.uid;
  const isTripInProgressByMe = trip.status === 'En Progreso' && trip.assignedCarrierId === user?.uid;
  const isTripWaitingForMyConfirmation = trip.status === 'Pagado' && trip.assignedCarrierId === user?.uid;
  
  const isTripAssignedToOther = (trip.status === 'Asignado' || trip.status === 'En Progreso') && trip.assignedCarrierId !== user?.uid;
  const isTripAssigned = trip.status === 'Asignado' || trip.status === 'En Progreso' || trip.status === 'Pagado' || trip.status === 'Completado';
  const isTripCompleted = trip.status === 'Completado';
  const isTripPending = trip.status === 'Pendiente';

  const publicDocuments = trip.documents?.filter(doc => doc.visibility === 'publico') || [];
  const privateDocuments = trip.documents?.filter(doc => doc.visibility === 'privado') || [];

  const isFleetIncomplete = !carrierData?.drivers?.length || !carrierData?.vehicles?.length || !carrierData?.trailers?.length;
  const hasNoTokens = !existingBid && (carrierData?.tokenBalance || 0) <= 0;


  const BidActionCard = () => {
    // If bid exists, show its status and edit/delete options
    if (existingBid) {
        return (
            <Card>
                <CardHeader><CardTitle>Tu Oferta</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">Tu oferta actual</p>
                        <p className="text-3xl font-bold">${formatNumber(existingBid.amount)}</p>
                    </div>
                    {isTripPending && (
                         <div className="grid grid-cols-2 gap-3">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline"><Trash2 className="mr-2 h-4 w-4"/>Eliminar</Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Tu oferta será eliminada.</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBid}>Confirmar</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                            <Button asChild><Link href={bidUrl}><Edit className="mr-2 h-4 w-4" />Editar</Link></Button>
                        </div>
                    )}
                </CardContent>
            </Card>
        );
    }

    // If no existing bid, show the main action button or disabled state
    return (
        <Card>
            <CardHeader><CardTitle>{trip.biddingType === 'fixed' ? 'Viaje de Precio Fijo' : 'Realizar Oferta'}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                {checkingBid ? (
                    <div className="flex justify-center items-center h-24"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                    <>
                        {trip.biddingType === 'fixed' ? (
                            <AcceptTripDialog trip={trip} carrierData={carrierData}>
                                <Button className="w-full h-12 text-lg" disabled={isFleetIncomplete || hasNoTokens}>
                                    Ofertar por Viaje
                                </Button>
                            </AcceptTripDialog>
                        ) : (
                            <Button className="w-full h-12 text-lg" asChild>
                                 <Link href={bidUrl} className={cn((isFleetIncomplete || hasNoTokens) && "pointer-events-none opacity-50")}>Realizar Oferta</Link>
                            </Button>
                        )}
                        {isFleetIncomplete && (
                            <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Flota Incompleta</AlertTitle>
                                <AlertDescription>
                                    <p>Debes configurar tu flota (conductor, unidad, aditamento) para poder ofertar. <Link href="/profile/edit?role=transportista" className="font-bold underline"><Wrench className="inline-block h-4 w-4 mr-1" />Gestionar Flota</Link></p>
                                </AlertDescription>
                            </Alert>
                        )}
                        {hasNoTokens && (
                             <Alert variant="destructive" className="mt-4">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Tokens Insuficientes</AlertTitle>
                                <AlertDescription>
                                    <p>Necesitas al menos 1 token para que tu oferta sea aceptada. <Link href="/wallet?role=transportista" className="font-bold underline"><Wallet className="inline-block h-4 w-4 mr-1" />Comprar Tokens</Link></p>
                                </AlertDescription>
                            </Alert>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

  const TripActionCard = () => {
    if (isTripAssignedToMe) {
        return (
            <Card>
                <CardHeader><CardTitle>Acciones del Viaje</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <Button size="lg" className="w-full" onClick={handleStartTrip}>
                        <Play className="mr-2 h-4 w-4" /> Comenzar Viaje
                    </Button>
                     {trip.creatorId && <ChatButtonWithBadge tripId={trip.id} participantId={trip.creatorId} />}
                </CardContent>
            </Card>
        )
    }
    if (isTripInProgressByMe) {
         return (
            <Card>
                <CardHeader><CardTitle>Acciones del Viaje</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <Button size="lg" className="w-full" onClick={handleFinishTrip}>
                        <Flag className="mr-2 h-4 w-4" /> Finalizar Viaje
                    </Button>
                     {trip.creatorId && <ChatButtonWithBadge tripId={trip.id} participantId={trip.creatorId} />}
                </CardContent>
            </Card>
        )
    }
    if (isTripWaitingForMyConfirmation) {
        return (
            <Card>
                <CardHeader><CardTitle>Acciones del Viaje</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <Button size="lg" className="w-full" onClick={handleConfirmPayment}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Pago y Completar
                    </Button>
                     {trip.creatorId && <ChatButtonWithBadge tripId={trip.id} participantId={trip.creatorId} />}
                </CardContent>
            </Card>
        )
    }
    if (isTripCompleted && trip.creatorId) {
        return (
            <Card>
                <CardHeader><CardTitle>Comunicación</CardTitle></CardHeader>
                <CardContent>
                    <ChatButtonWithBadge tripId={trip.id} participantId={trip.creatorId} />
                </CardContent>
            </Card>
        )
    }
    return null;
  }
  
  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(0);
    }
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }

  const MobileFooterActions = () => {
    if (isActionLoading || checkingBid) {
        return (
            <Button size="lg" className="w-full" disabled>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cargando...
            </Button>
        );
    }
    
    // --- Highest priority actions ---
    if (isTripInProgressByMe) {
      return (
        <Button size="lg" className="w-full" onClick={handleFinishTrip}>
          <Flag className="mr-2 h-4 w-4" /> Finalizar Viaje
        </Button>
      );
    }
    if (isTripAssignedToMe) {
      return (
        <Button size="lg" className="w-full" onClick={handleStartTrip}>
          <Play className="mr-2 h-4 w-4" /> Comenzar Viaje
        </Button>
      );
    }
     if (isTripWaitingForMyConfirmation) {
        return (
            <Button size="lg" className="w-full" onClick={handleConfirmPayment}>
                <CheckCircle className="mr-2 h-4 w-4" /> Confirmar Pago y Completar
            </Button>
        );
    }

    // --- Informational states ---
    if (isTripCompleted) {
        return (
          <div className="text-center text-muted-foreground p-3 bg-muted rounded-md text-sm">
            Este viaje ha sido completado.
          </div>
        );
    }
    if (isTripAssignedToOther) {
        return (
          <div className="text-center text-muted-foreground p-3 bg-muted rounded-md text-sm">
            Este viaje ya fue asignado.
          </div>
        );
    }
    
    // --- Bidding actions ---
    if (existingBid) {
      return isTripPending ? (
        <div className="grid grid-cols-2 gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="lg"><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader><AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Tu oferta será eliminada.</AlertDialogDescription></AlertDialogHeader>
              <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteBid}>Confirmar</AlertDialogAction></AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button size="lg" asChild><Link href={bidUrl}><Edit className="mr-2 h-4 w-4" />Editar Oferta</Link></Button>
        </div>
      ) : (
        <Button className="w-full h-12 text-lg" disabled>Oferta Enviada</Button>
      );
    }

    // --- Default action: Make a bid ---
     if (isTripPending) {
        return trip.biddingType === 'fixed' ? (
        <AcceptTripDialog trip={trip} carrierData={carrierData}>
          <Button className="w-full h-12 text-lg" disabled={isFleetIncomplete || hasNoTokens}>
            Ofertar por Viaje
          </Button>
        </AcceptTripDialog>
      ) : (
        <Button className="w-full h-12 text-lg" asChild>
          <Link href={bidUrl} className={cn((isFleetIncomplete || hasNoTokens) && "pointer-events-none opacity-50")}>
            Realizar Oferta
          </Link>
        </Button>
      );
    }

    return null; // Should not be reached
  }

  return (
    <div className="bg-gray-50 pb-24 lg:pb-0">
      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between bg-card p-4 border-b">
        <Link href="/dashboard?role=transportista" className="p-2 -ml-2">
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div className="flex items-center gap-2">
          {/* <Button variant="ghost" size="icon"><Bookmark className="h-5 w-5" /></Button>
          <Button variant="ghost" size="icon"><Share2 className="h-5 w-5" /></Button> */}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 lg:gap-8">
            
          {/* Columna Izquierda: Detalles del viaje */}
          <div className="lg:col-span-2 space-y-6">
            {/* -- Bid Info Header -- */}
            <div className="bg-card p-4 rounded-lg border">
                <p className="text-sm text-muted-foreground">PRESUPUESTO DE LA EMPRESA</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(trip.budget)}</p>
                <p className="text-sm text-muted-foreground">{getBiddingTypeLabel(trip.biddingType)}</p>
            </div>
            
             {isTripCompleted && (
                <Card className="rounded-lg border-green-500 bg-green-50">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Archive className="h-8 w-8 text-green-600 flex-shrink-0" />
                    <div className="flex-grow">
                      <p className="font-bold text-green-800">Viaje Completado</p>
                      <p className="text-sm text-green-700">Este viaje ha finalizado y está archivado. La información es de solo lectura.</p>
                    </div>
                  </CardContent>
                </Card>
            )}

            {(isTripAssignedToMe || isTripInProgressByMe || isTripWaitingForMyConfirmation) && !isTripCompleted && (
              <Card className="rounded-lg border-green-500 bg-green-50">
                  <CardContent className="p-4 flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                      <div className="flex-grow text-left">
                        <p className="font-bold text-green-800">¡Viaje Asignado!</p>
                        <p className="text-sm text-green-700">Este viaje te ha sido asignado. ¡Prepárate para la ruta!</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
            )}

            {isTripAssignedToOther && (
                <Card className="rounded-lg border-yellow-500 bg-yellow-50">
                    <CardContent className="p-4">
                        <p className="font-bold text-yellow-800">Este viaje ya no está disponible.</p>
                        <p className="text-sm text-yellow-700">Ha sido asignado a otro transportista.</p>
                    </CardContent>
                </Card>
            )}

            {/* -- Trip Details Cards -- */}
            <div className="space-y-2">
                {isLoaded && trip.originCoords && trip.destinationCoords ? (
                    <Card>
                        <CardHeader><CardTitle className="text-lg">Mapa de la Ruta</CardTitle></CardHeader>
                        <CardContent>
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={trip.originCoords}
                                zoom={5}
                                onLoad={onMapLoad}
                                options={mapOptions}
                            >
                                <MarkerF position={trip.originCoords} label="O" />
                                <MarkerF position={trip.destinationCoords} label="D" />
                            </GoogleMap>
                        </CardContent>
                    </Card>
                ) : null }

                <Card>
                    <CardHeader><CardTitle className="text-lg">Ruta y Horarios</CardTitle></CardHeader>
                    <CardContent className="space-y-6 text-sm">
                        <TripInfoSection icon={MapPin} title="Recoger en"><p className="font-semibold">{trip.originAddress}</p></TripInfoSection>
                        <TripInfoSection icon={Calendar} title="Fecha de Recolección"><p className="font-semibold">{formatDate(trip.pickupDate)}</p></TripInfoSection>
                         {trip.pickupDateTentative && <TripInfoSection icon={Calendar} title="Otra Fecha de Carga (Opcional)"><p className="font-semibold">{formatDate(trip.pickupDateTentative)}</p></TripInfoSection>}
                        <div className="border-b" />
                        <TripInfoSection icon={MapPin} title="Entregar en"><p className="font-semibold">{trip.destinationAddress}</p></TripInfoSection>
                        <TripInfoSection icon={Calendar} title="Fecha de Entrega"><p className="font-semibold">{formatDate(trip.deliveryDate)}</p></TripInfoSection>
                         {trip.deliveryDateTentative && <TripInfoSection icon={Calendar} title="Otra Fecha de Entrega (Opcional)"><p className="font-semibold">{formatDate(trip.deliveryDateTentative)}</p></TripInfoSection>}
                        <TripInfoSection icon={Milestone} title="Distancia Estimada"><p className="font-semibold">{trip.distanceKm ? `${trip.distanceKm.toFixed(2)} km` : 'No calculada'}</p></TripInfoSection>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader><CardTitle className="text-lg">Detalles de la Carga</CardTitle></CardHeader>
                    <CardContent className="space-y-6 text-sm">
                        <TripInfoSection icon={ClipboardList} title="Descripción"><p>{trip.cargoDescription || 'N/A'}</p></TripInfoSection>
                        <TripInfoSection icon={Box} title="Categoría"><p className="font-semibold">{getCargoTypeLabel()}</p></TripInfoSection>
                        <TripInfoSection icon={Weight} title="Peso Total"><p className="font-semibold">{trip.totalWeight.toLocaleString()} {trip.weightUnit}</p></TripInfoSection>
                        <TripInfoSection icon={Package} title="Bultos / Pallets"><p className="font-semibold">{trip.packageCount}</p></TripInfoSection>
                        <TripInfoSection icon={Package} title="Tipo de Embalaje"><p className="font-semibold">{getPackagingTypeLabel()}</p></TripInfoSection>
                        <TripInfoSection icon={Scaling} title="Dimensiones (LxAnxAl)"><p className="font-semibold">{trip.dimensions || 'No especificadas'}</p></TripInfoSection>
                        <TripInfoSection icon={Box} title="Volumen"><p className="font-semibold">{trip.volume ? `${trip.volume} m³` : 'N/A'}</p></TripInfoSection>
                        <TripInfoSection icon={DollarSign} title="Valor de Mercancía"><p className="font-semibold">{trip.merchandiseValue ? `$${trip.merchandiseValue.toLocaleString()} ${trip.merchandiseCurrency || 'MXN'}` : 'No especificado'}</p></TripInfoSection>
                        <TripInfoSection icon={ShieldCheck} title="Requiere Seguro"><p className="font-semibold">{trip.requiresInsurance === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        <TripInfoSection icon={Package} title="Apilable"><p className="font-semibold">{trip.isStackable === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        <TripInfoSection icon={Share2} title="Viaje Compartido"><p className="font-semibold">{trip.isShared === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        <TripInfoSection icon={ClipboardList} title="Observaciones Adicionales"><p>{trip.observations || 'Ninguna'}</p></TripInfoSection>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader><CardTitle className="text-lg">Documentos</CardTitle></CardHeader>
                    <CardContent className="space-y-2">
                        {publicDocuments.length === 0 && privateDocuments.length === 0 && (
                            <p className="text-sm text-center text-muted-foreground p-4">No hay documentos adjuntos para este viaje.</p>
                        )}

                        {publicDocuments.map((doc, index) => (
                            <a key={`pub-${index}`} href={doc.url} download={doc.name} className="flex items-center justify-between p-3 -mx-3 rounded-md hover:bg-muted">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-semibold text-sm">{doc.name}</p>
                                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Descargar</Button>
                            </a>
                        ))}

                        {(isTripAssignedToMe || isTripInProgressByMe || trip.status === 'Completado') && privateDocuments.length > 0 && (
                            <>
                                {publicDocuments.length > 0 && <div className="border-t my-2" />}
                                <h3 className="text-sm font-semibold text-muted-foreground px-3 pt-2">Documentos Privados</h3>
                                {privateDocuments.map((doc, index) => (
                                <a key={`priv-${index}`} href={doc.url} download={doc.name} className="flex items-center justify-between p-3 -mx-3 rounded-md hover:bg-muted">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-semibold text-sm">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">{doc.type}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">Descargar</Button>
                                </a>
                                ))}
                            </>
                        )}
                    </CardContent>
                </Card>
                
                <Card>
                    <CardHeader><CardTitle className="text-lg">Condiciones y Requerimientos</CardTitle></CardHeader>
                    <CardContent className="space-y-6 text-sm">
                        <TripInfoSection icon={Gavel} title="Modalidad de Oferta"><p className="font-semibold">{getBiddingTypeLabel(trip.biddingType)}</p></TripInfoSection>
                        <TripInfoSection icon={CreditCard} title="Forma de Pago"><p className="font-semibold">{getPaymentMethodLabel()}</p></TripInfoSection>
                        <TripInfoSection icon={Clock} title="Momento del Pago">
                            <p className="font-semibold">{getPaymentTimingLabel(trip.paymentTiming)} {trip.paymentTiming === 'credito' && trip.paymentInstallments && `(${trip.paymentInstallments} parcialidades)`}</p>
                        </TripInfoSection>
                        <div className="border-b" />
                        <TripInfoSection icon={Truck} title="Tipo de camión requerido"><p className="font-semibold">{trip.truckType === 'otro' ? trip.otherTruckType : trip.truckType || 'N/A'}</p></TripInfoSection>
                        <TripInfoSection icon={ClipboardSignature} title="Licencia Requerida"><p className="font-semibold">{getLicenseTypeLabel(trip.requiredLicenseType)}</p></TripInfoSection>
                        <TripInfoSection icon={Milestone} title="Tipo de Ruta"><p className="font-semibold">{trip.routeType === 'caseta' ? 'Caseta' : 'Libre'}</p></TripInfoSection>
                        <TripInfoSection icon={HardHat} title="¿Ayuda en carga/descarga?"><p className="font-semibold">{trip.requiresCarrierAssist === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        <TripInfoSection icon={Zap} title="¿Requiere rastreo satelital?"><p className="font-semibold">{trip.requiresGps === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        <TripInfoSection icon={Zap} title="¿Se requiere grúa?"><p className="font-semibold">{trip.requiresCrane === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        <TripInfoSection icon={ShieldCheck} title="¿Requiere Escolta?"><p className="font-semibold">{trip.requiresEscort === 'yes' ? 'Sí' : 'No'}</p></TripInfoSection>
                        {(isTripAssignedToMe || isTripInProgressByMe) && (
                            <TripInfoSection icon={Phone} title="Contacto en Destino"><p className="font-semibold">{trip.destinationContact || 'No especificado'}</p></TripInfoSection>
                        )}
                    </CardContent>
                </Card>
                
                {trip.merchandisePhotos && trip.merchandisePhotos.length > 0 && (
                  <Card>
                    <CardHeader><CardTitle className="text-lg">Fotos de la Mercancía</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {trip.merchandisePhotos.map((url, index) => (
                        <a key={index} href={url} target="_blank" rel="noopener noreferrer">
                            <Image
                            src={url}
                            alt={`Foto de la mercancía ${index + 1}`}
                            width={200}
                            height={200}
                            className="rounded-md object-cover aspect-square hover:opacity-80 transition-opacity"
                            />
                        </a>
                      ))}
                    </CardContent>
                  </Card>
                )}
             </div>
          </div>

          {/* Columna Derecha: Acciones de oferta */}
          <div className="hidden lg:block lg:col-span-1">
             <div className="sticky top-24 space-y-4">
                {isTripCompleted || isTripAssignedToOther ? null : (isTripAssignedToMe || isTripInProgressByMe || isTripWaitingForMyConfirmation) ? <TripActionCard /> : <BidActionCard />}
             </div>
          </div>

        </div>
      </main>
      
      {/* Footer / Action Button for Mobile */}
      <footer className="fixed bottom-0 z-10 bg-card p-4 border-t lg:hidden pb-safe-bottom w-full">
        <MobileFooterActions />
      </footer>
    </div>
  );
}
