'use client';

import { useEffect, useState } from 'react';
import type { Bid, Trip, CarrierProfileData, Driver } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Calendar, MapPin, Loader2, AlertTriangle, CheckCircle, XCircle, Clock, HelpCircle, Ban, User, Check, MessageSquare, Truck, Package, Info } from 'lucide-react';
import { useTrips } from '@/context/trips-context';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';
import Link from 'next/link';
import { Button } from '../ui/button';
import { useRouter } from 'next/navigation';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
import Image from 'next/image';


interface BidCardProps {
  bid: Bid;
  view?: 'carrier' | 'company';
  showTripInfo?: boolean;
}

const BidStatusBadge = ({ status, tripStatus }: { status: Bid['status'], tripStatus?: Trip['status'] }) => {
    // If the bid was accepted, its status should reflect the trip's progress.
    if (status === 'accepted') {
        if (tripStatus === 'Asignado' || tripStatus === 'En Progreso') {
             return <Badge variant="default" className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Asignado</Badge>;
        }
        if (tripStatus === 'Completado' || tripStatus === 'En Espera de Pago' || tripStatus === 'Pagado') {
             return <Badge variant="default" className="bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completado</Badge>;
        }
    }

    // If the trip is assigned to someone else, this bid was not selected.
    if (tripStatus && ['Asignado', 'En Progreso', 'Completado', 'En Espera de Pago', 'Pagado'].includes(tripStatus) && status !== 'accepted') {
        return <Badge variant="secondary" className="bg-gray-500"><XCircle className="mr-1 h-3 w-3" />No seleccionada</Badge>;
    }
    
    // Default status for pending or rejected bids if the above conditions aren't met.
    const statusInfo: Record<Bid['status'], { variant: 'secondary' | 'default' | 'destructive'; icon: React.ElementType; label: string }> = {
        pending: {
            variant: 'secondary',
            icon: Clock,
            label: 'Pendiente',
        },
        accepted: { // Fallback for 'accepted' if trip status is somehow not covered above
            variant: 'default',
            icon: CheckCircle,
            label: 'Aceptada',
        },
        rejected: {
            variant: 'destructive',
            icon: XCircle,
            label: 'Rechazada',
        },
    };

    const currentStatus = statusInfo[status];

    if (!currentStatus) {
        return <Badge variant="secondary"><HelpCircle className="mr-1 h-3 w-3" />Desconocido</Badge>;
    }
    
    const Icon = currentStatus.icon;

    return <Badge variant={currentStatus.variant}><Icon className="mr-1 h-3 w-3" />{currentStatus.label}</Badge>;
};


const ChatButtonWithBadge = ({ tripId, participantId }: { tripId: string, participantId: string }) => {
    const { getUnreadMessagesCountForCompany } = useTrips();
    const [unreadCount, setUnreadCount] = useState(0);
    const [user] = useAuthState(auth);

    useEffect(() => {
        if (tripId && participantId && user) {
            const unsubscribe = getUnreadMessagesCountForCompany(tripId, participantId, setUnreadCount);
            return () => unsubscribe();
        }
    }, [tripId, participantId, getUnreadMessagesCountForCompany, user]);

    const chatUrl = `/chat/${tripId}/${participantId}`;

    return (
        <Button size="sm" variant="outline" className="w-full relative" asChild>
            <Link href={chatUrl}>
                <MessageSquare className="mr-2 h-4 w-4" /> Ir al Chat
                {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-2 -right-2 rounded-full h-5 w-5 p-0 justify-center">
                        {unreadCount}
                    </Badge>
                )}
            </Link>
        </Button>
    )
}

const BidDetailsDialog = ({ bid, carrierData }: { bid: Bid; carrierData: CarrierProfileData }) => {
    const driver = carrierData.drivers?.find(d => d.id === bid.selectedDriverId);
    const vehicle = carrierData.vehicles?.find(v => v.id === bid.selectedVehicleId);
    const trailer = carrierData.trailers?.find(t => t.id === bid.selectedTrailerId);

    const DetailRow = ({ label, value, href }: { label: string; value?: string; href?: string }) => {
        if (!value) return null;
        return (
            <div className="flex justify-between items-center text-sm py-2 border-b last:border-b-0">
                <span className="text-muted-foreground">{label}</span>
                {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary hover:underline truncate max-w-[150px] sm:max-w-xs" title={value}>
                        {value}
                    </a>
                ) : (
                    <span className="font-semibold text-right">{value}</span>
                )}
            </div>
        );
    };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="link" size="sm" className="p-0 h-auto" onClick={e => e.stopPropagation()}>
                    Ver Detalles Completos
                </Button>
            </DialogTrigger>
             <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Detalles de la Oferta</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {driver && (
                        <Card>
                            <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <Avatar className="h-16 w-16">
                                    <AvatarImage src={driver.photoURL} alt={driver.name} className="object-cover" />
                                    <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-semibold text-lg">Conductor</h4>
                                    <p className="text-muted-foreground">{driver.name}</p>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <DetailRow label="Licencia" value={driver.license?.licenseNumber} />
                                <DetailRow label="Tipo" value={driver.license?.licenseType ? `Tipo "${driver.license.licenseType}"` : 'N/A'} />
                                <DetailRow label="Vencimiento" value={driver.license?.expirationDate ? format(new Date(driver.license.expirationDate), 'PPP', { locale: es }) : 'N/A'} />
                                <DetailRow label="Anverso Licencia" value={driver.license?.frontScanName || 'Ver/Descargar'} href={driver.license?.frontScanUrl} />
                                <DetailRow label="Reverso Licencia" value={driver.license?.backScanName || 'Ver/Descargar'} href={driver.license?.backScanUrl} />
                            </CardContent>
                        </Card>
                    )}
                    {vehicle && (
                        <Card>
                             <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <Avatar className="h-16 w-16 border rounded-md">
                                    <AvatarImage src={vehicle.photoUrl} alt={vehicle.brand} className="object-cover" />
                                    <AvatarFallback><Truck className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-semibold text-lg">Unidad</h4>
                                    <p className="text-muted-foreground">{vehicle.brand} {vehicle.model}</p>
                                </div>
                             </CardHeader>
                             <CardContent>
                                <DetailRow label="Tipo" value={vehicle.type === 'otro' ? vehicle.otherType : vehicle.type} />
                                <DetailRow label="Marca / Modelo" value={`${vehicle.brand} ${vehicle.model} (${vehicle.year})`} />
                                <DetailRow label="Placas" value={vehicle.licensePlate} />
                             </CardContent>
                        </Card>
                    )}
                    {trailer && (
                         <Card>
                             <CardHeader className="flex-row items-center gap-4 space-y-0">
                                <Avatar className="h-16 w-16 border rounded-md">
                                    <AvatarImage src={trailer.photoUrl} alt={trailer.type} className="object-cover" />
                                    <AvatarFallback><Package className="h-8 w-8 text-muted-foreground" /></AvatarFallback>
                                </Avatar>
                                <div>
                                    <h4 className="font-semibold text-lg">Aditamento</h4>
                                    <p className="text-muted-foreground">{trailer.type} {trailer.length}</p>
                                </div>
                             </CardHeader>
                             <CardContent>
                                <DetailRow label="Tipo" value={trailer.type === 'Otro' ? trailer.otherType : trailer.type} />
                                <DetailRow label="Largo" value={trailer.length} />
                                <DetailRow label="Placas" value={trailer.licensePlate} />
                             </CardContent>
                        </Card>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export function BidCard({ bid, view = 'carrier', showTripInfo = false }: BidCardProps) {
    const router = useRouter();
    const { getTripById, acceptBid, getUserProfile } = useTrips();
    const { toast } = useToast();
    const [trip, setTrip] = useState<Trip | null>(null);
    const [carrierData, setCarrierData] = useState<CarrierProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAccepting, setIsAccepting] = useState(false);


    useEffect(() => {
        const fetchTrip = async () => {
            if (!bid.tripId) {
                setLoading(false);
                return;
            }
            try {
                const [fetchedTrip, fetchedCarrierData] = await Promise.all([
                    getTripById(bid.tripId),
                    view === 'company' ? getUserProfile(bid.carrierId) : Promise.resolve(null)
                ]);
                setTrip(fetchedTrip || null);
                if (fetchedCarrierData) {
                    setCarrierData(fetchedCarrierData);
                }
            } catch (error) {
                console.error("Error fetching trip or carrier data for bid card:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTrip();
    }, [bid.tripId, bid.carrierId, getTripById, getUserProfile, view]);
    
    const handleAcceptBid = async () => {
        if (!trip) return;
        
        setIsAccepting(true);
        try {
            await acceptBid(trip.id, bid);
            toast({
                title: '¡Oferta Aceptada!',
                description: `El viaje ha sido asignado a ${bid.carrierName}.`,
            });
            router.push(`/chat/${trip.id}/${bid.carrierId}`);
        } catch (error) {
            console.error("Error accepting bid:", error);
            toast({
                title: 'Error',
                description: 'No se pudo aceptar la oferta. Por favor, inténtalo de nuevo.',
                variant: 'destructive',
            });
        } finally {
            setIsAccepting(false);
        }
    }


    if (loading) {
        return <Skeleton className="h-40 w-full" />;
    }

    if (!trip) {
        return (
             <Card className="bg-muted/50">
                <CardContent className="p-4 flex items-center gap-4 text-muted-foreground">
                    <Ban className="h-6 w-6 flex-shrink-0"/>
                    <div>
                        <p className="font-bold">Este viaje ya no está disponible</p>
                        <p className="text-sm">La solicitud de viaje asociada a tu oferta de ${typeof bid.amount === 'number' ? bid.amount.toLocaleString() : 'N/A'} fue eliminada por la empresa.</p>
                    </div>
                </CardContent>
            </Card>
        );
    }
    
    const roleForUrl = view === 'company' ? 'empresa' : 'transportista';
    const detailsUrl = `/trips/${trip.id}?role=${roleForUrl}`;
    
    // Logic to show/hide "Accept Offer" button
    const canAcceptOffer = view === 'company' && trip.status === 'Pendiente';

    const isTripAssigned = trip.status === 'Asignado' || trip.status === 'En Progreso' || trip.status === 'Completado' || trip.status === 'Pagado' || trip.status === 'En Espera de Pago';
    const isBidAccepted = bid.status === 'accepted';
    const participantIdForChat = view === 'company' ? bid.carrierId : trip.creatorId;

    const isTripAssignedToOther = isTripAssigned && trip.assignedCarrierId !== bid.carrierId;

    return (
        <Card className="transition-all hover:shadow-md">
            <CardHeader className="p-4 flex-row items-start justify-between">
                {view === 'carrier' ? (
                    <div>
                        <p className="text-xs text-muted-foreground">Tu oferta</p>
                        <p className="text-xl font-bold text-primary">${bid.amount.toLocaleString()}</p>
                    </div>
                ) : (
                     <div className="flex items-center gap-3 flex-1">
                        <Avatar className="h-10 w-10">
                            <AvatarImage src={bid.carrierPhotoUrl} alt={bid.carrierName} />
                            <AvatarFallback>{bid.carrierName?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                             <Link href={`/carrier/${bid.carrierId}?tripId=${trip.id}`} onClick={(e) => e.stopPropagation()} className="hover:underline font-semibold text-primary">
                                {bid.carrierName}
                             </Link>
                             <p className="text-xl font-bold text-primary">${bid.amount.toLocaleString()}</p>
                        </div>
                    </div>
                )}
                <BidStatusBadge status={bid.status} tripStatus={trip.status} />
            </CardHeader>
            <CardContent className="p-4 pt-0 text-sm">
                <div className="border-t pt-3 space-y-2">
                   {view === 'carrier' || showTripInfo ? (
                     <div>
                        {isTripAssignedToOther ? (
                             <p className="font-bold text-base">{trip.shipmentId}</p>
                        ) : (
                            <Link href={detailsUrl} className="hover:underline">
                                <p className="font-bold text-base">{trip.shipmentId}</p>
                            </Link>
                        )}

                        <div className="flex items-center gap-2 text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span>{trip.origin}</span>
                            <ArrowRight className="h-4 w-4 flex-shrink-0 text-primary" />
                            <span>{trip.destination}</span>
                        </div>
                    </div>
                   ) : null}
                    <p className="text-xs text-muted-foreground">
                        {bid.createdAt?.toDate ? 
                            `Ofertado ${formatDistanceToNow(bid.createdAt.toDate(), { addSuffix: true, locale: es })}` : 
                            'Fecha de oferta no disponible'
                        }
                    </p>

                    {view === 'company' && (
                        <div className='pt-3 mt-3 border-t space-y-1.5'>
                            <div className='flex items-center gap-2 font-medium'>
                                <User className='h-4 w-4 text-muted-foreground'/>
                                <span>Conductor: {bid.selectedDriverName || 'N/A'}</span>
                            </div>
                            <div className='flex items-center gap-2 font-medium'>
                                <Truck className='h-4 w-4 text-muted-foreground'/>
                                <span>Unidad: {bid.selectedVehicleInfo || 'N/A'}</span>
                            </div>
                            <div className='flex items-center gap-2 font-medium'>
                                <Package className='h-4 w-4 text-muted-foreground'/>
                                <span>Aditamento: {bid.selectedTrailerInfo || 'N/A'}</span>
                            </div>
                            {carrierData && (
                                <div className="pt-1">
                                    <BidDetailsDialog bid={bid} carrierData={carrierData} />
                                </div>
                            )}
                        </div>
                    )}
                     
                    {canAcceptOffer && (
                        <div className="pt-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button size="sm" className="w-full" disabled={isAccepting}>
                                         {isAccepting ? (
                                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Aceptando...</>
                                        ) : (
                                            <><Check className="mr-2 h-4 w-4" /> Aceptar Oferta</>
                                        )}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>¿Aceptar esta oferta?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            ¿Estás seguro de que quieres aceptar la oferta de {bid.carrierName} por ${bid.amount.toLocaleString()}? Esto asignará el viaje a este transportista.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleAcceptBid}>Aceptar</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                     )}
                     {(isTripAssigned && isBidAccepted) && participantIdForChat && (
                         <div className="pt-2">
                           <ChatButtonWithBadge tripId={trip.id} participantId={participantIdForChat} />
                        </div>
                     )}
                </div>
            </CardContent>
        </Card>
    );
}
