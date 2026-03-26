

'use client';

import type { Trip, Bid, TripDocument } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileUp, Upload, Package, Weight, Box, Scaling, ShieldCheck, DollarSign, MapPin, Calendar, CreditCard, ClipboardList, Truck, Satellite, Phone, ClipboardSignature, Trash2, HardHat, Clock, Gavel, Check, Loader2, User, X, Camera, Share2, MessageSquare, AlertCircle, Archive, Copy, Milestone, Star, FileText, PauseCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import Image from 'next/image';
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { useTrips } from '@/context/trips-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useCallback, useRef, ChangeEvent } from 'react';
import { Badge } from '../ui/badge';
import { GoogleMap, MarkerF, useLoadScript } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps-config';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { BidCard } from './bid-card';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { uploadFileToServer } from '@/lib/server-actions';
import { Input } from '../ui/input';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


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

interface TripDetailsProps {
  trip: Trip;
}

const InfoRow = ({ label, value, icon: Icon, children }: { label: string; value?: React.ReactNode; icon: React.ElementType, children?: React.ReactNode }) => (
    <div className="flex items-start justify-between py-2">
        <div className="flex items-center gap-3 text-sm">
            <Icon className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">{label}</span>
        </div>
        <div className="text-right text-sm font-semibold max-w-[70%]">
            {value}
            {children}
        </div>
    </div>
);

const SectionTitle = ({ children } : { children: React.ReactNode }) => (
    <h4 className="text-md font-semibold text-primary mt-6 mb-2 border-b pb-2">{children}</h4>
);

const BidsList = ({ trip }: { trip: Trip }) => {
    const { getBidsForTrip } = useTrips();
    const [bids, setBids] = useState<Bid[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = getBidsForTrip(trip.id, (newBids) => {
            // Sort bids: accepted first, then by amount ascending
            const sortedBids = newBids.sort((a, b) => {
                if (a.status === 'accepted' && b.status !== 'accepted') return -1;
                if (b.status === 'accepted' && a.status !== 'accepted') return 1;
                return a.amount - b.amount;
            });
            setBids(sortedBids);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [trip.id, getBidsForTrip]);

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    if (bids.length === 0) {
        return <p className="text-center text-muted-foreground p-8">Aún no hay ofertas para este viaje.</p>;
    }
    
    return (
        <div className="space-y-3">
            {bids.map(bid => (
                <BidCard key={bid.id} bid={bid} view="company" />
            ))}
        </div>
    );
};


const RatingSection = ({ trip }: { trip: Trip }) => {
    const [rating, setRating] = useState(0);
    const [hover, setHover] = useState(0);
    const [submitting, setSubmitting] = useState(false);
    const { submitRating } = useTrips();
    const { toast } = useToast();

    const handleSubmitRating = async () => {
        if (rating === 0) {
            toast({ title: 'Calificación inválida', description: 'Por favor, selecciona de 1 a 5 estrellas.', variant: 'destructive'});
            return;
        }
        if (!trip.assignedCarrierId) return;

        setSubmitting(true);
        try {
            await submitRating({
                tripId: trip.id,
                carrierId: trip.assignedCarrierId,
                companyId: trip.creatorId,
                stars: rating,
            });
            toast({ title: 'Calificación Enviada', description: 'Gracias por calificar al transportista.' });
        } catch (error) {
            console.error(error);
            toast({ title: 'Error', description: 'No se pudo enviar la calificación.', variant: 'destructive'});
        } finally {
            setSubmitting(false);
        }
    };
    
    if (trip.isRated) {
        return (
            <Card className="bg-muted">
                <CardContent className="p-4 text-center text-muted-foreground">
                    <p>Gracias, ya has calificado este viaje.</p>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader><CardTitle>Calificar al Transportista</CardTitle></CardHeader>
            <CardContent className="text-center space-y-4">
                <p className="text-muted-foreground">¿Cómo fue tu experiencia con {trip.assignedCarrierName}?</p>
                <div className="flex justify-center gap-2">
                    {[...Array(5)].map((_, index) => {
                        const starValue = index + 1;
                        return (
                             <Button
                                key={starValue}
                                variant="ghost"
                                size="icon"
                                onClick={() => setRating(starValue)}
                                onMouseEnter={() => setHover(starValue)}
                                onMouseLeave={() => setHover(0)}
                                className="h-10 w-10"
                            >
                                <Star
                                    className={`h-8 w-8 transition-colors ${
                                        starValue <= (hover || rating)
                                        ? 'text-yellow-400 fill-yellow-400'
                                        : 'text-muted-foreground'
                                    }`}
                                />
                             </Button>
                        )
                    })}
                </div>
                <Button onClick={handleSubmitRating} disabled={submitting || rating === 0}>
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Enviar Calificación
                </Button>
            </CardContent>
        </Card>
    );
};


const UploadDocumentDialog = ({ trip, onUploadComplete }: { trip: Trip; onUploadComplete: () => void }) => {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<TripDocument['type']>('Otro');
  const [visibility, setVisibility] = useState<TripDocument['visibility']>('privado');
  const [isLoading, setIsLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const { updateTrip } = useTrips();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] || null);
  };
  
  const handleUpload = async () => {
    if (!file) {
      toast({ title: "No hay archivo seleccionado", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    try {
        const dataUrl = await fileToDataUrl(file);
        const filePath = `trip_documents/${trip.creatorId}/${trip.id}/${Date.now()}_${file.name}`;
        const url = await uploadFileToServer(filePath, dataUrl);
        
        const newDocument: TripDocument = {
            name: file.name,
            url,
            uploadedAt: new Date().toISOString(),
            type: docType,
            visibility: visibility,
        };
        
        const updatedDocuments = [...(trip.documents || []), newDocument];
        await updateTrip({ id: trip.id, documents: updatedDocuments });
        
        toast({ title: "Documento subido con éxito" });
        onUploadComplete(); // This could refresh the parent component's data
        setFile(null);
        setOpen(false);

    } catch (error) {
        console.error("Error uploading document:", error);
        toast({ title: "Error al subir", description: "No se pudo subir el documento.", variant: "destructive" });
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full mt-4" variant="outline"><Upload className="mr-2 h-4 w-4"/>Subir Documento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subir Nuevo Documento</DialogTitle>
          <DialogDescription>
            Añade un documento al viaje. Podrás definir su tipo y visibilidad.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <div className="space-y-2">
                <Label htmlFor="file-upload">Archivo</Label>
                <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} />
                {file && <p className="text-sm text-muted-foreground">Seleccionado: {file.name}</p>}
            </div>
            <div className="space-y-2">
                <Label htmlFor="doc-type">Tipo de Documento</Label>
                 <Select value={docType} onValueChange={(value) => setDocType(value as TripDocument['type'])}>
                    <SelectTrigger id="doc-type">
                        <SelectValue placeholder="Selecciona un tipo" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="Carta Porte">Carta Porte</SelectItem>
                        <SelectItem value="Ficha Técnica">Ficha Técnica</SelectItem>
                        <SelectItem value="Otro">Otro</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label>Visibilidad</Label>
                 <RadioGroup value={visibility} onValueChange={(value) => setVisibility(value as TripDocument['visibility'])}>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="publico" id="r-publico" />
                        <Label htmlFor="r-publico">Público (Visible para todos los transportistas)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="privado" id="r-privado" />
                        <Label htmlFor="r-privado">Privado (Solo para el transportista asignado)</Label>
                    </div>
                </RadioGroup>
            </div>
        </div>
        <DialogFooter>
          <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
          <Button onClick={handleUpload} disabled={isLoading || !file}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Subir y Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export function TripDetails({ trip }: TripDetailsProps) {
  const { deleteTrip, markTripAsPaid, toggleTripStatus } = useTrips();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const role = searchParams.get('role');
  const [isActionLoading, setIsActionLoading] = useState(false);

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


  const handleDelete = async () => {
    try {
      router.push(`/dashboard?role=empresa`);
      toast({
        title: "Eliminando Viaje...",
        description: `El viaje ${trip.shipmentId} se está eliminando.`,
      });
      await deleteTrip(trip.id);
    } catch (error) {
        console.error("Failed to delete trip:", error);
        toast({
            title: "Error al eliminar",
            description: "No se pudo eliminar el viaje. Por favor, inténtalo de nuevo.",
            variant: "destructive"
        });
    }
  }

  const handleMarkAsPaid = async () => {
    await markTripAsPaid(trip.id);
    toast({ title: 'Viaje Marcado como Pagado', description: 'El transportista ha sido notificado para confirmar el pago.' });
  };
  
  const handleReuseTrip = () => {
    if (!trip) return;
    
    const { 
        id, 
        createdAt, 
        status, 
        assignedCarrierId, 
        assignedCarrierName, 
        finalPrice, 
        documents, 
        merchandisePhotos,
        isRated,
        assignedDriverName,
        assignedDriverPhotoUrl,
        assignedVehicleInfo,
        assignedTrailerInfo,
        ...restOfTrip 
    } = trip;

    const toISO = (date: any): string | undefined => {
      if (!date) return undefined;
      if (date.toDate) return date.toDate().toISOString();
      if (typeof date === 'string') return date;
      if (date instanceof Date) return date.toISOString();
      try {
        return new Date(date).toISOString();
      } catch (e) {
        return undefined;
      }
    }
    
    const reuseData = {
        ...restOfTrip,
        pickupDate: toISO(trip.pickupDate),
        deliveryDate: toISO(trip.deliveryDate),
        pickupDateTentative: toISO(trip.pickupDateTentative),
        deliveryDateTentative: toISO(trip.deliveryDateTentative),
    };

    const cleanedData = Object.entries(reuseData).reduce((acc, [key, value]) => {
      if (value !== undefined && value !== null) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);

    try {
        localStorage.setItem('ucarga_reusable_trip', JSON.stringify(cleanedData));
        router.push(`/running/new?role=empresa&reuse=true`);
    } catch (error) {
        console.error("Could not save to localStorage", error);
        toast({
            title: "Error al reutilizar",
            description: "No se pudo guardar la información del viaje para reutilizar.",
            variant: "destructive"
        });
    }
};

  const handleTogglePause = async () => {
      setIsActionLoading(true);
      await toggleTripStatus(trip.id, trip.status);
      setIsActionLoading(false);
  };


  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), "PPP, h:mm a", { locale: es });
  }
  
  const getCargoTypeLabel = () => {
    if (!trip.cargoType) return 'N/A';
    if (trip.cargoType === 'Otros' && trip.otherCargoType) {
        return `Otros: ${trip.otherCargoType}`;
    }
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

  const getPaymentTimingLabel = (timing: 'inmediato' | 'contra entrega' | 'credito') => {
    const labels = {
        'inmediato': 'Pago Inmediato',
        'contra entrega': 'Pago Contra Entrega',
        'credito': 'Pago a Crédito'
    };
    return labels[timing];
  }

  const getBiddingTypeLabel = (type: 'fixed' | 'auction' | 'competition') => {
    const labels = {
        'fixed': 'Precio Fijo',
        'auction': 'Subasta',
        'competition': 'Competencia'
    };
    return labels[trip.biddingType];
  }
  
  const isTripCompleted = trip.status === 'Completado';
  const isTripAssigned = trip.status === 'Asignado' || trip.status === 'En Progreso' || trip.status === 'Pagado' || isTripCompleted;

  
  const formatCurrency = (value?: number) => {
    if (typeof value !== 'number') {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(0);
    }
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
  }
  
  const publicDocs = trip.documents?.filter(doc => doc.visibility === 'publico') || [];
  const privateDocs = trip.documents?.filter(doc => doc.visibility === 'privado') || [];

  return (
    <Tabs defaultValue="info" className="w-full">
      <div className="flex justify-between items-center mb-4 gap-4">
        <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="bids">Ofertas</TabsTrigger>
            <TabsTrigger value="docs">Documentos</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
            {(trip.status === 'Asignado' || isTripCompleted) && trip.assignedCarrierId && (
                <Button asChild variant="outline">
                    <Link href={`/chat/${trip.id}/${trip.assignedCarrierId}`}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Chat
                    </Link>
                </Button>
            )}
             {trip.status === 'En Espera de Pago' && !isTripCompleted && (
                <Button onClick={handleMarkAsPaid}>
                    <DollarSign className="mr-2 h-4 w-4" /> Marcar como Pagado
                </Button>
             )}
             {isTripCompleted && (
                <Button variant="secondary" onClick={handleReuseTrip}>
                   <Copy className="mr-2 h-4 w-4" /> Reutilizar Viaje
                </Button>
             )}
             {trip.status === 'Pendiente' && (
                <Button variant="outline" size="sm" onClick={handleTogglePause} disabled={isActionLoading}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PauseCircle className="mr-2 h-4 w-4" />}
                    Pausar
                </Button>
             )}
             {trip.status === 'Pausado' && (
                <Button variant="outline" size="sm" onClick={handleTogglePause} disabled={isActionLoading}>
                    {isActionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                    Reanudar
                </Button>
             )}
              {(trip.status === 'Pendiente' || trip.status === 'Pausado') && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                         <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4" />Eliminar</Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar este viaje?</AlertDialogTitle>
                            <AlertDialogDescription>Esta acción es permanente y no se puede deshacer. Se eliminará el viaje y todas las ofertas asociadas.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
        </div>
      </div>
      <div className="mt-4">
        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información del Viaje</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">

                {isLoaded && trip.originCoords && trip.destinationCoords ? (
                    <>
                        <SectionTitle>🗺️ Mapa de la Ruta</SectionTitle>
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
                    </>
                ) : null }
                
                 {isTripCompleted && (
                    <div className="space-y-4">
                        <SectionTitle>⭐ Calificación</SectionTitle>
                        <RatingSection trip={trip} />
                    </div>
                )}


                {trip.status === 'En Espera de Pago' && (
                    <Card className="bg-yellow-50 border-yellow-400">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="h-5 w-5 text-yellow-700" />
                                <div className="flex-1">
                                    <p className="font-bold text-yellow-800">Acción Requerida: Pago Pendiente</p>
                                    <p className="text-sm text-yellow-700">El transportista ha finalizado el viaje. Por favor, realiza el pago y márcalo aquí.</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {(trip.status === 'Asignado' || trip.status === 'En Progreso' || trip.status === 'Pagado' || trip.status === 'Completado') && trip.assignedCarrierName && (
                    <>
                    <SectionTitle>✅ Viaje Asignado</SectionTitle>
                    <InfoRow icon={User} label="Transportista Asignado" value={<Link href={`/carrier/${trip.assignedCarrierId}`} className="text-primary hover:underline">{trip.assignedCarrierName}</Link>} />
                    <InfoRow icon={DollarSign} label="Precio Final Acordado" value={formatCurrency(trip.finalPrice)} />
                    <InfoRow icon={User} label="Conductor Designado">
                       <p>{trip.assignedDriverName || 'N/A'}</p>
                    </InfoRow>
                    <InfoRow icon={Truck} label="Unidad Designada" value={trip.assignedVehicleInfo || 'N/A'} />
                    <InfoRow icon={Package} label="Aditamento Designado" value={trip.assignedTrailerInfo || 'N/A'} />
                    </>
                )}

                <SectionTitle>📍 Ruta y Horarios</SectionTitle>
                <InfoRow icon={MapPin} label="Origen" value={trip.originAddress || 'N/A'} />
                <InfoRow icon={Calendar} label="Fecha de Carga" value={formatDate(trip.pickupDate)} />
                {trip.pickupDateTentative && <InfoRow icon={Calendar} label="Otra Fecha de Carga" value={formatDate(trip.pickupDateTentative)} />}
                <InfoRow icon={MapPin} label="Destino" value={trip.destinationAddress || 'N/A'} />
                <InfoRow icon={Calendar} label="Fecha de Entrega" value={formatDate(trip.deliveryDate)} />
                {trip.deliveryDateTentative && <InfoRow icon={Calendar} label="Otra Fecha de Entrega" value={formatDate(trip.deliveryDateTentative)} />}
                <InfoRow icon={Truck} label="Distancia Estimada" value={trip.distanceKm ? `${trip.distanceKm.toFixed(2)} km` : 'No calculada'} />

                <SectionTitle>📦 Detalles de la Carga</SectionTitle>
                <InfoRow icon={Package} label="Descripción" value={trip.cargoDescription || 'N/A'} />
                <InfoRow icon={Box} label="Categoría de Carga" value={getCargoTypeLabel()} />
                <InfoRow icon={Weight} label="Peso Total" value={`${trip.totalWeight?.toLocaleString() || 0} ${trip.weightUnit}`} />
                <InfoRow icon={Scaling} label="Dimensiones (LxAnxAl)" value={trip.dimensions || 'N/A'} />
                <InfoRow icon={Box} label="Volumen" value={trip.volume ? `${trip.volume} m³` : 'N/A'} />
                <InfoRow icon={Package} label="Cantidad y Tipo" value={`${trip.packageCount || 0} ${trip.packageType || 'N/A'}`} />
                <InfoRow icon={Package} label="Tipo de Embalaje" value={getPackagingTypeLabel()} />
                <InfoRow icon={DollarSign} label="Valor de Mercancía" value={trip.merchandiseValue ? `$${trip.merchandiseValue.toLocaleString()} ${trip.merchandiseCurrency || 'MXN'}` : 'No especificado'} />
                <InfoRow icon={ShieldCheck} label="Requiere Seguro" value={trip.requiresInsurance === 'yes' ? 'Sí' : 'No'} />
                <InfoRow icon={Package} label="Es Apilable" value={trip.isStackable === 'yes' ? 'Sí' : 'No'} />
                <InfoRow icon={Share2} label="Viaje Compartido" value={trip.isShared === 'yes' ? 'Sí' : 'No'} />
                
                <SectionTitle>💲 Condiciones</SectionTitle>
                <InfoRow icon={Gavel} label="Modalidad de Oferta" value={getBiddingTypeLabel(trip.biddingType)} />
                <InfoRow icon={CreditCard} label="Forma de Pago" value={getPaymentMethodLabel()} />
                 <InfoRow icon={Clock} label="Momento del Pago">
                    <span>{getPaymentTimingLabel(trip.paymentTiming)} {trip.paymentTiming === 'credito' && trip.paymentInstallments && `(${trip.paymentInstallments} parcialidades)`}</span>
                </InfoRow>
                <InfoRow icon={DollarSign} label="Monto a pagar por transportista" value={formatCurrency(trip.budget)} />
                <InfoRow icon={ClipboardList} label="Observaciones" value={trip.observations || 'Ninguna'} />
                
                <SectionTitle>🚚 Requerimientos del Transportista</SectionTitle>
                <InfoRow icon={Truck} label="Tipo de Camión" value={trip.truckType === 'otro' ? trip.otherTruckType : trip.truckType || 'N/A'} />
                <InfoRow icon={ClipboardSignature} label="Licencia Requerida" value={getLicenseTypeLabel(trip.requiredLicenseType)} />
                 <InfoRow icon={Milestone} label="Tipo de Ruta" value={trip.routeType === 'caseta' ? 'Caseta' : 'Libre'} />
                <InfoRow icon={Satellite} label="Requiere GPS" value={trip.requiresGps === 'yes' ? 'Sí' : 'No'} />
                <InfoRow icon={HardHat} label="Ayuda en Carga/Descarga" value={trip.requiresCarrierAssist === 'yes' ? 'Sí' : 'No'} />
                <InfoRow icon={Truck} label="¿Se requiere grúa?" value={trip.requiresCrane === 'yes' ? 'Sí' : 'No'}/>
                 <InfoRow icon={ShieldCheck} label="¿Requiere Escolta?" value={trip.requiresEscort === 'yes' ? 'Sí' : 'No'}/>
                <InfoRow icon={Phone} label="Contacto en Destino" value={trip.destinationContact || 'No especificado'} />
                
                 {trip.merchandisePhotos && trip.merchandisePhotos.length > 0 && (
                    <>
                        <SectionTitle>📷 Fotos de la Mercancía</SectionTitle>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 py-4">
                        {trip.merchandisePhotos.map((url, index) => (
                            <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square">
                                <Image
                                src={url}
                                alt={`Foto de la mercancía ${index + 1}`}
                                fill
                                className="rounded-md object-cover hover:opacity-80 transition-opacity"
                                />
                            </a>
                        ))}
                        </div>
                    </>
                )}

            </CardContent>
          </Card>
        </TabsContent>
         <TabsContent value="bids">
          <Card>
            <CardHeader>
              <CardTitle>Ofertas Recibidas</CardTitle>
            </CardHeader>
            <CardContent>
              <BidsList trip={trip} />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="docs">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {(!trip.documents || trip.documents.length === 0) && (
                    <p className="text-sm text-muted-foreground text-center p-4">No hay documentos para este viaje.</p>
                )}

                {publicDocs.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Documentos Públicos</h4>
                        <div className="space-y-2">
                        {publicDocs.map((doc, index) => (
                            <a key={`pub-${index}`} href={doc.url} download={doc.name} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                        <p className="font-medium">{doc.name}</p>
                                        <p className="text-xs text-muted-foreground">{doc.type}</p>
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm">Descargar</Button>
                            </a>
                        ))}
                        </div>
                    </div>
                )}
                
                {privateDocs.length > 0 && (
                    <div className="mt-4">
                         <h4 className="font-semibold text-sm mb-2">Documentos Privados</h4>
                        <div className="space-y-2">
                            {privateDocs.map((doc, index) => (
                                <a key={`priv-${index}`} href={doc.url} download={doc.name} className="flex items-center justify-between rounded-md border p-3 hover:bg-muted">
                                    <div className="flex items-center gap-3">
                                        <FileText className="h-5 w-5 text-muted-foreground" />
                                        <div>
                                            <p className="font-medium">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">{doc.type}</p>
                                        </div>
                                    </div>
                                    <Button variant="ghost" size="sm">Descargar</Button>
                                </a>
                            ))}
                        </div>
                        {!isTripAssigned && (
                            <p className="text-xs text-muted-foreground p-3 border rounded-md mt-2">Estos documentos se compartirán con el transportista una vez que el viaje sea asignado.</p>
                        )}
                    </div>
                )}
                <UploadDocumentDialog trip={trip} onUploadComplete={() => { /* Re-fetch or update state if needed */ }} />
            </CardContent>
          </Card>
        </TabsContent>
      </div>
    </Tabs>
  );
}
