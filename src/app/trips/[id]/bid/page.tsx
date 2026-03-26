
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Loader2, Wallet, User, Truck, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTrips } from '@/context/trips-context';
import type { Trip, Bid, CarrierProfileData } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import Link from 'next/link';
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
import { formatNumber, parseFormattedNumber } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';


const bidFormSchema = z.object({
  bidAmount: z.preprocess(
    (a) => (typeof a === 'string' ? parseFormattedNumber(a) : a),
    z.number().positive('La oferta debe ser un número positivo.')
  ),
  selectedDriverId: z.string().min(1, 'Debes seleccionar un conductor.'),
  selectedVehicleId: z.string().min(1, 'Debes seleccionar una unidad.'),
  selectedTrailerId: z.string().min(1, 'Debes seleccionar un aditamento.'),
});

type BidFormValues = z.infer<typeof bidFormSchema>;

function BidPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { getTripById, addBid, updateBid, getCarrierBidForTrip, getUserProfile, updateUserProfile } = useTrips();
  
  const [user, authLoading] = useAuthState(auth);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [existingBid, setExistingBid] = useState<Bid | null>(null);
  const [carrierData, setCarrierData] = useState<CarrierProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);


  const tripId = typeof params.id === 'string' ? params.id : '';
  const role = searchParams.get('role');
  const bidIdFromQuery = searchParams.get('bid_id');
  const backUrl = `/trips/${tripId}?role=${role || 'transportista'}`;

  const form = useForm<BidFormValues>({
    resolver: zodResolver(bidFormSchema),
    defaultValues: {
      bidAmount: 0,
      selectedDriverId: '',
      selectedVehicleId: '',
      selectedTrailerId: '',
    },
  });

  // Watch selection values to show previews
  const watchedDriverId = useWatch({ control: form.control, name: 'selectedDriverId' });
  const watchedVehicleId = useWatch({ control: form.control, name: 'selectedVehicleId' });
  const watchedTrailerId = useWatch({ control: form.control, name: 'selectedTrailerId' });

  const selectedDriver = carrierData?.drivers?.find(d => d.id === watchedDriverId);
  const selectedVehicle = carrierData?.vehicles?.find(v => v.id === watchedVehicleId);
  const selectedTrailer = carrierData?.trailers?.find(t => t.id === watchedTrailerId);

  useEffect(() => {
    if (tripId && user) {
      const fetchTripAndBid = async () => {
        setLoading(true);
        try {
          const [fetchedTrip, carrierBid, fetchedCarrierData] = await Promise.all([
              getTripById(tripId),
              getCarrierBidForTrip(tripId, user.uid),
              getUserProfile(user.uid)
          ]);

          setTrip(fetchedTrip || null);
          setExistingBid(carrierBid);
          setCarrierData(fetchedCarrierData as CarrierProfileData | null);

          if (carrierBid) {
              form.reset({
                bidAmount: carrierBid.amount,
                selectedDriverId: carrierBid.selectedDriverId || '',
                selectedVehicleId: carrierBid.selectedVehicleId || '',
                selectedTrailerId: carrierBid.selectedTrailerId || '',
              });
          } else if (fetchedTrip) {
              form.setValue('bidAmount', fetchedTrip.budget);
          }
        } catch (error) {
            console.error("Error fetching bid page data:", error);
            toast({ title: 'Error', description: 'No se pudo cargar la información para ofertar.', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
      };
      fetchTripAndBid();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [tripId, user, authLoading, getTripById, getCarrierBidForTrip, form, getUserProfile, toast]);

 const handleFormSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setShowConfirmation(true);
    }
  };


  const executeSubmit = async () => {
    const data = form.getValues();
    if (authLoading || !user || !carrierData) {
        toast({ title: 'Error', description: 'Debes iniciar sesión y tener un perfil completo para ofertar.', variant: 'destructive' });
        return;
    }
    if (!trip) {
        toast({ title: 'Error', description: 'No se pudo cargar la información del viaje.', variant: 'destructive' });
        return;
    }
    
    if (trip.biddingType === 'auction' && data.bidAmount > trip.budget) {
        form.setError('bidAmount', { type: 'manual', message: `En modo subasta, la oferta no puede superar $${trip.budget.toLocaleString()}.` });
        setShowConfirmation(false);
        return;
    }

    setIsSubmitting(true);

    try {
        const driver = carrierData.drivers?.find(d => d.id === data.selectedDriverId);
        const vehicle = carrierData.vehicles?.find(v => v.id === data.selectedVehicleId);
        const trailer = carrierData.trailers?.find(t => t.id === data.selectedTrailerId);

        const bidPayload: Partial<Bid> = {
            amount: data.bidAmount,
            selectedDriverId: data.selectedDriverId,
            selectedVehicleId: data.selectedVehicleId,
            selectedTrailerId: data.selectedTrailerId,
            selectedDriverName: driver?.name || 'N/A',
            selectedVehicleInfo: vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.licensePlate})` : 'N/A',
            selectedTrailerInfo: trailer ? `${trailer.type} - ${trailer.length}` : 'N/A',
            selectedDriverPhotoUrl: driver?.photoURL,
        };

        if (existingBid) {
          await updateBid(tripId, existingBid.id, bidPayload);
          toast({ 
            title: 'Oferta Actualizada', 
            description: `Tu oferta ha sido actualizada a $${formatNumber(data.bidAmount)}.` 
          });
        } else {
          await addBid(trip.id, user.uid, carrierData.fullName || user.displayName || "Transportista Anónimo", carrierData.photoURL, bidPayload);
          let messageTitle = 'Oferta Enviada';
          let messageDescription = `Tu oferta de $${formatNumber(data.bidAmount)} ha sido enviada.`;
           if (trip.biddingType === 'fixed') {
             messageTitle = 'Oferta de Precio Fijo Enviada';
             messageDescription = `Tu oferta para el viaje ${trip.shipmentId} ha sido enviada a la empresa para su asignación final.`;
          }
          toast({ title: messageTitle, description: messageDescription });
        }
        router.push(`/bids?role=transportista`);
        
    } catch (error) {
        console.error("Error submitting bid: ", error);
        toast({ title: 'Error', description: 'No se pudo procesar tu solicitud. Inténtalo de nuevo.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
      setShowConfirmation(false);
    }
  };

  const isFleetIncomplete = !carrierData?.drivers?.length || !carrierData?.vehicles?.length || !carrierData?.trailers?.length;
  const hasNoTokens = (carrierData?.tokenBalance || 0) <= 0;

  if (loading || authLoading) {
      return (
        <div className="flex h-dvh flex-col bg-card items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )
  }

  if (!trip) {
    return (
       <div className="flex h-dvh flex-col bg-card items-center justify-center">
         <p>No se encontró el viaje.</p>
         <Button onClick={() => router.back()} className="mt-4">Volver</Button>
       </div>
    );
  }
  
  const getSubtitle = () => {
      if (existingBid) {
          return `Estás editando tu oferta anterior de $${formatNumber(existingBid.amount)}.`;
      }
      switch (trip.biddingType) {
          case 'auction':
              return `Modo Subasta: Oferta máxima es $${formatNumber(trip.budget)}. Puedes ofertar este monto o menos.`;
          case 'competition':
              return `Modo Competencia: El presupuesto base es $${formatNumber(trip.budget)}. Tu oferta puede ser mayor o menor.`;
          case 'fixed':
               return `El precio para este viaje es fijo. Confirma tu equipo para enviar tu oferta.`;
          default:
              return 'Envía tu mejor oferta para esta carga.';
      }
  }

  const isFixedPrice = trip.biddingType === 'fixed';
  const submitButtonText = existingBid
    ? 'Actualizar Oferta'
    : isFixedPrice
    ? 'Enviar Oferta de Precio Fijo'
    : 'Realizar Oferta';
  
  const confirmationMessage = existingBid
      ? `¿Estás seguro de que quieres actualizar tu oferta a $${formatNumber(form.getValues('bidAmount'))}?`
      : `Estás a punto de enviar una oferta por $${formatNumber(form.getValues('bidAmount'))}. Si tu oferta es aceptada, se descontará 1 token. ¿Deseas continuar?`;

  const NoTokensCard = () => (
    <Card className="border-destructive">
        <CardContent className="p-4 text-center">
            <Wallet className="mx-auto h-12 w-12 text-destructive mb-2" />
            <h3 className="text-lg font-semibold">No tienes tokens</h3>
            <p className="text-muted-foreground text-sm mb-4">
                Necesitas tener al menos 1 token en tu billetera para que tus ofertas puedan ser aceptadas.
            </p>
            <Button asChild>
                <Link href="/wallet?role=transportista">
                    <Wallet className="mr-2 h-4 w-4" /> Comprar Tokens
                </Link>
            </Button>
        </CardContent>
    </Card>
  );

  return (
    <div className="flex h-dvh flex-col bg-card">
      <header className="flex items-center justify-between p-4 border-b">
        <div className="w-8"></div> {/* Spacer */}
        <h1 className="text-xl font-bold">{existingBid ? 'Editar Oferta' : 'Realizar Oferta'}</h1>
        <Button variant="ghost" size="icon" onClick={() => router.push(backUrl)}>
          <X className="h-6 w-6" />
        </Button>
      </header>

      <main className="flex flex-1 flex-col p-6 overflow-y-auto">
        {hasNoTokens && !existingBid ? (
            <NoTokensCard />
        ) : (
            <Form {...form}>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col justify-between h-full space-y-8">
                    <div className="space-y-6">
                        <div>
                            <Label htmlFor="bidAmount" className="sr-only">MI OFERTA (MXN)</Label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-4 flex items-center text-3xl text-muted-foreground">$</span>
                                <FormField
                                    control={form.control}
                                    name="bidAmount"
                                    render={({ field }) => (
                                        <FormItem>
                                        <FormControl>
                                        <Input
                                            id="bidAmount"
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="24,500"
                                            className="h-20 w-full pl-10 pr-4 text-4xl font-bold text-center"
                                            autoFocus
                                            disabled={isFixedPrice}
                                            {...field}
                                            value={formatNumber(field.value)}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        />
                                        </FormControl>
                                        <FormMessage className="text-center pt-2" />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground text-center">{getSubtitle()}</p>
                        </div>

                        <div className="space-y-6">
                            {/* Driver Selection with Preview */}
                            <FormField
                                control={form.control}
                                name="selectedDriverId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seleccionar Conductor</FormLabel>
                                        <div className="flex items-center gap-3">
                                            {selectedDriver?.photoURL && (
                                                <Avatar className="h-12 w-12 border shadow-sm">
                                                    <AvatarImage src={selectedDriver.photoURL} alt={selectedDriver.name} />
                                                    <AvatarFallback><User className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="flex-1">
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige un conductor..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {carrierData?.drivers?.map(driver => <SelectItem key={driver.id} value={driver.id}>{driver.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Vehicle Selection with Preview */}
                            <FormField
                                control={form.control}
                                name="selectedVehicleId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seleccionar Unidad (Camión)</FormLabel>
                                        <div className="flex items-center gap-3">
                                            {selectedVehicle?.photoUrl && (
                                                <Avatar className="h-12 w-12 border shadow-sm rounded-md">
                                                    <AvatarImage src={selectedVehicle.photoUrl} alt={selectedVehicle.brand} />
                                                    <AvatarFallback><Truck className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="flex-1">
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige una unidad..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {carrierData?.vehicles?.map(v => <SelectItem key={v.id} value={v.id}>{v.brand} {v.model} ({v.licensePlate})</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* Trailer Selection with Preview */}
                            <FormField
                                control={form.control}
                                name="selectedTrailerId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Seleccionar Aditamento</FormLabel>
                                        <div className="flex items-center gap-3">
                                            {selectedTrailer?.photoUrl && (
                                                <Avatar className="h-12 w-12 border shadow-sm rounded-md">
                                                    <AvatarImage src={selectedTrailer.photoUrl} alt={selectedTrailer.type} />
                                                    <AvatarFallback><Package className="h-6 w-6 text-muted-foreground" /></AvatarFallback>
                                                </Avatar>
                                            )}
                                            <div className="flex-1">
                                                <Select onValueChange={field.onChange} value={field.value}>
                                                    <FormControl><SelectTrigger><SelectValue placeholder="Elige un aditamento..." /></SelectTrigger></FormControl>
                                                    <SelectContent>
                                                        {carrierData?.trailers?.map(t => <SelectItem key={t.id} value={t.id}>{t.type} - {t.length}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            
                            {isFleetIncomplete && (
                                <p className='text-sm text-destructive text-center p-2 bg-destructive/10 rounded-md'>Debes configurar al menos un conductor, una unidad y un aditamento en tu perfil para poder ofertar.</p>
                            )}
                        </div>
                    </div>
                    
                    <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
                        <AlertDialogTrigger asChild>
                            <Button type="button" size="lg" className="w-full py-7 text-lg" disabled={isSubmitting || isFleetIncomplete} onClick={handleFormSubmit}>
                                {isSubmitting ? <Loader2 className="h-6 w-6 animate-spin"/> : submitButtonText}
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Oferta</AlertDialogTitle>
                                <AlertDialogDescription>{confirmationMessage}</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={executeSubmit}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </form>
            </Form>
        )}
      </main>
    </div>
  );
}


export default function BidPage() {
    return (
        <Suspense fallback={<div className="flex h-dvh items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <BidPageContent />
        </Suspense>
    );
}
