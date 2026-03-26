
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, useWatch, type Control } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { ArrowLeft, Save, Calendar as CalendarIcon, ClipboardSignature, FileUp, HelpCircle, Camera, Trash2, Loader2, X, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn, formatNumber, parseFormattedNumber } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTrips } from '@/context/trips-context';
import type { Trip, TripDocument } from '@/lib/types';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Suspense, useState, useRef, ChangeEvent, useCallback, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { useAuthState } from 'react-firebase-hooks/auth';
import Image from 'next/image';
import { GoogleMap, useLoadScript, MarkerF, Autocomplete, DirectionsRenderer } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/lib/google-maps-config';
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
import { uploadFileToServer } from '@/lib/server-actions';

const libraries: ("places")[] = ['places'];

const mapContainerStyle = {
  height: '400px',
  width: '100%',
  borderRadius: '0.5rem'
};

const center = {
  lat: 23.6345,
  lng: -102.5528
};

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const formSchema = z.object({
  // Carga
  cargoDescription: z.string().min(1, 'La descripción es obligatoria.'),
  cargoType: z.enum(['Maquinaria pesada', 'Mercancía comercial', 'Contenedores', 'Carga refrigerada', 'Ganado', 'Instrumentos musicales', 'Vehículos', 'Muebles', 'Obras de arte', 'Otros']),
  otherCargoType: z.string().optional(),
  totalWeight: z.preprocess(
    (val) => (typeof val === 'string' ? parseFormattedNumber(val) : val),
    z.coerce.number().positive('El peso debe ser un número positivo.')
  ),
  weightUnit: z.enum(['kg', 'lb', 'ton']),
  volume: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('El volumen debe ser un número positivo.').optional()
  ),
  length: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Debe ser un número positivo.').optional()
  ),
  width: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Debe ser un número positivo.').optional()
  ),
  height: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().positive('Debe ser un número positivo.').optional()
  ),
  lengthUnit: z.enum(['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi']).default('m'),
  widthUnit: z.enum(['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi']).default('m'),
  heightUnit: z.enum(['mm', 'cm', 'm', 'km', 'in', 'ft', 'yd', 'mi']).default('m'),
  packageCount: z.preprocess(
    (val) => (typeof val === 'string' ? parseFormattedNumber(val) : val),
    z.coerce.number().int().positive('Debe ser un número entero positivo.')
  ),
  packageType: z.enum(['pieza', 'set', 'paquete', 'docena', 'par', 'caja', 'bulto', 'rollo', 'pallet', 'tambor', 'master_box', 'contenedor', 'ton_kg', 'litro_galon']),
  packagingType: z.enum(['Cartón corrugado', 'Cartón sólido o microcorrugado', 'Madera', 'Metálica', 'Plástica', 'Compuesta (mixta)', 'Otro']).optional(),
  otherPackagingType: z.string().optional(),
  merchandiseValue: z.preprocess(
    (a) => (a === '' ? undefined : typeof a === 'string' ? parseFormattedNumber(a) : a),
    z.coerce.number().positive('El valor debe ser un número positivo.').optional()
  ),
  merchandiseCurrency: z.enum(['EUR', 'MXN', 'USD', 'JPY']).default('MXN'),
  requiresInsurance: z.enum(['yes', 'no']),
  isStackable: z.enum(['yes', 'no']),
  isShared: z.enum(['yes', 'no']),

  // Origen y Destino
  originAddress: z.string().min(1, 'La dirección de origen es obligatoria.'),
  destinationAddress: z.string().min(1, 'La dirección de destino es obligatoria.'),
  
  pickupDate: z.date({ required_error: 'La fecha es obligatoria.' }),
  pickupTime: z.string().min(1, 'La hora es obligatoria.'),
  pickupDateTentative: z.date().optional(),
  pickupTimeTentative: z.string().optional(),
  
  deliveryDate: z.date({ required_error: 'La fecha es obligatoria.' }),
  deliveryTime: z.string().min(1, 'La hora es obligatoria.'),
  deliveryDateTentative: z.date().optional(),
  deliveryTimeTentative: z.string().optional(),

  // Condiciones
  biddingType: z.enum(['fixed', 'auction', 'competition']),
  paymentMethod: z.enum(['transferencia', 'efectivo', 'credito', 'cheque', 'otros']),
  otherPaymentMethod: z.string().optional(),
  paymentTiming: z.enum(['inmediato', 'contra entrega', 'credito']),
  paymentInstallments: z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().int().positive('Debe ser un número entero positivo.').optional()
  ),
  budget: z.preprocess(
    (a) => (typeof a === 'string' ? parseFormattedNumber(a) : a),
    z.coerce.number().positive('El presupuesto debe ser un número positivo.')
  ),
  observations: z.string().optional(),

  // Extras
  truckType: z.enum(['Camioneta pick-up', 'Camión tipo panel (van)', 'Camión rabón', 'Camión de redilas mediano', 'Camión torton', 'Tráiler (tractocamión con caja seca o plataforma)', 'Camión caja seca', 'Camión refrigerado', 'Camión de redilas', 'Camión plataforma', 'Camión cisterna (pipa)', 'Camión de volteo', 'Camión jaula ganadera 🐄', 'Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅', 'Rabón', 'Torton', 'Tractocamión con caja seca, plataforma o jaula', 'otro']),
  otherTruckType: z.string().optional(),
  requiresGps: z.enum(['yes', 'no']),
  requiresCarrierAssist: z.enum(['yes', 'no']),
  requiresCrane: z.enum(['yes', 'no']).default('no'),
  requiresEscort: z.enum(['yes', 'no']).default('no'),
  requiredLicenseType: z.enum(['B', 'C', 'E']).optional(),
  destinationContact: z.string().optional(),
  routeType: z.enum(['caseta', 'libre']).default('caseta'),

  // Documentos
  cartaPorteVisibility: z.enum(['privado', 'publico']).default('privado'),
  fichaTecnicaVisibility: z.enum(['privado', 'publico']).default('privado'),
  otroDocumentoVisibility: z.enum(['privado', 'publico']).default('privado'),

}).superRefine((data, ctx) => {
    if (data.paymentMethod === 'otros' && (!data.otherPaymentMethod || data.otherPaymentMethod.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, especifica el otro método de pago.',
            path: ['otherPaymentMethod'],
        });
    }
     if (data.paymentTiming === 'credito' && (!data.paymentInstallments || data.paymentInstallments <= 0)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Debes indicar el número de parcialidades.',
            path: ['paymentInstallments'],
        });
    }
    if (data.cargoType === 'Otros' && (!data.otherCargoType || data.otherCargoType.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, especifica la otra categoría de carga.',
            path: ['otherCargoType'],
        });
    }
    if (data.packagingType === 'Otro' && (!data.otherPackagingType || data.otherPackagingType.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, especifica el otro tipo de embalaje.',
            path: ['otherPackagingType'],
        });
    }
    if (data.truckType === 'otro' && (!data.otherTruckType || data.otherTruckType.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, especifica el otro tipo de camión.',
            path: ['otherTruckType'],
        });
    }
});


type FormValues = z.infer<typeof formSchema>;

const FileUploadRow = ({ label, fieldName, file, onFileChange, onFileRemove, control, disabled }: { 
    label: string, 
    fieldName: keyof FormValues,
    file: File | null,
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void,
    onFileRemove: () => void,
    control: Control<FormValues>,
    disabled?: boolean
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    return (
        <div className="flex flex-col sm:flex-row items-start justify-between rounded-lg border p-4 gap-4">
            <div className="flex-1">
                <p className="font-medium">{label}</p>
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={onFileChange}
                    className="hidden"
                    disabled={disabled}
                />
                {file ? (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <span>{file.name}</span>
                        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onFileRemove} disabled={disabled}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <p className="text-xs text-muted-foreground">No se ha subido ningún archivo.</p>
                )}
                 <Button type="button" variant="outline" className="mt-2" onClick={() => fileInputRef.current?.click()} disabled={disabled}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Subir archivo
                </Button>
            </div>
            <FormField
                name={fieldName}
                control={control}
                render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>Visibilidad</FormLabel>
                        <FormControl>
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value as string}
                                className="flex flex-col space-y-1"
                                disabled={disabled}
                            >
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="publico" /></FormControl>
                                    <FormLabel className="font-normal">Público</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-3 space-y-0">
                                    <FormControl><RadioGroupItem value="privado" /></FormControl>
                                    <FormLabel className="font-normal">Privado</FormLabel>
                                </FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}
            />
        </div>
    );
};


const OtherPaymentField = ({ control }: { control: any }) => {
    const paymentMethod = useWatch({
        control,
        name: 'paymentMethod',
    });

    if (paymentMethod !== 'otros') return null;

    return (
        <FormField control={control} name="otherPaymentMethod" render={({ field }) => (
            <FormItem>
                <FormLabel>Especificar otro método</FormLabel>
                <FormControl><Input placeholder="Ej: Pago contra entrega" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};

const PaymentInstallmentsField = ({ control }: { control: any }) => {
    const paymentTiming = useWatch({
        control,
        name: 'paymentTiming',
    });

    if (paymentTiming !== 'credito') return null;

    return (
        <FormField control={control} name="paymentInstallments" render={({ field }) => (
            <FormItem>
                <FormLabel>Número de Parcialidades</FormLabel>
                <FormControl><Input type="number" placeholder="Ej: 3" {...field} value={field.value ?? ''} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};

const OtherCargoTypeField = ({ control }: { control: any }) => {
    const cargoType = useWatch({
        control,
        name: 'cargoType',
    });

    if (cargoType !== 'Otros') return null;

    return (
        <FormField control={control} name="otherCargoType" render={({ field }) => (
            <FormItem>
                <FormLabel>Especificar otra categoría</FormLabel>
                <FormControl><Input placeholder="Ej: Mascotas vivas" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};

const OtherPackagingTypeField = ({ control }: { control: any }) => {
    const packagingType = useWatch({
        control,
        name: 'packagingType',
    });

    if (packagingType !== 'Otro') return null;

    return (
        <FormField control={control} name="otherPackagingType" render={({ field }) => (
            <FormItem>
                <FormLabel>Especificar otro tipo de embalaje</FormLabel>
                <FormControl><Input placeholder="Ej: Embalaje especial" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};

const OtherTruckTypeField = ({ control }: { control: any }) => {
    const truckType = useWatch({
        control,
        name: 'truckType',
    });

    if (truckType !== 'otro') return null;

    return (
        <FormField control={control} name="otherTruckType" render={({ field }) => (
            <FormItem>
                <FormLabel>Especificar otro tipo de camión</FormLabel>
                <FormControl><Input placeholder="Ej: Lowboy" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};


function CreateTripPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addTrip, updateTrip, deleteTrip } = useTrips();
  const { toast } = useToast();
  const role = searchParams.get('role');
  const [user, authLoading] = useAuthState(auth);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for files
  const [merchandisePhotos, setMerchandisePhotos] = useState<File[]>([]);
  const [cartaPorteFile, setCartaPorteFile] = useState<File | null>(null);
  const [fichaTecnicaFile, setFichaTecnicaFile] = useState<File | null>(null);
  const [otroDocumentoFile, setOtroDocumentoFile] = useState<File | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);


  const photoInputRef = useRef<HTMLInputElement>(null);

  // Map state
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });
  
  const mapRef = useRef<google.maps.Map | null>(null);
  
  const [originAutocomplete, setOriginAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [destinationAutocomplete, setDestinationAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const originInputRef = useRef<HTMLInputElement>(null);
  const destinationInputRef = useRef<HTMLInputElement>(null);

  type MarkerData = { lat: number, lng: number };
  const [originMarker, setOriginMarker] = useState<MarkerData | null>(null);
  const [destinationMarker, setDestinationMarker] = useState<MarkerData | null>(null);
  const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);
  const [distance, setDistance] = useState<number | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cargoDescription: '',
      cargoType: 'Mercancía comercial',
      otherCargoType: '',
      totalWeight: '',
      weightUnit: 'kg',
      volume: '',
      length: '',
      width: '',
      height: '',
      lengthUnit: 'm',
      widthUnit: 'm',
      heightUnit: 'm',
      packageCount: '',
      packageType: 'caja',
      packagingType: 'Cartón corrugado',
      otherPackagingType: '',
      merchandiseValue: '',
      merchandiseCurrency: 'MXN',
      requiresInsurance: 'no',
      isStackable: 'no',
      isShared: 'no',
      originAddress: "",
      destinationAddress: "",
      pickupTime: '',
      pickupTimeTentative: '',
      deliveryTime: '',
      deliveryTimeTentative: '',
      biddingType: 'auction',
      paymentMethod: 'transferencia',
      otherPaymentMethod: '',
      paymentTiming: 'contra entrega',
      paymentInstallments: '',
      budget: '',
      observations: '',
      truckType: 'Tráiler (tractocamión con caja seca o plataforma)',
      otherTruckType: '',
      requiresGps: 'yes',
      requiresCarrierAssist: 'no',
      requiresCrane: 'no',
      requiresEscort: 'no',
      requiredLicenseType: undefined,
      destinationContact: '',
      routeType: 'caseta',
      cartaPorteVisibility: 'privado',
      fichaTecnicaVisibility: 'privado',
      otroDocumentoVisibility: 'privado',
    }
  });

  const handleUnitChange = (unit: 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi') => {
      form.setValue('lengthUnit', unit);
      form.setValue('widthUnit', unit);
      form.setValue('heightUnit', unit);
  };

  // Handle reused trip data from localStorage
  useEffect(() => {
    if (searchParams.get('reuse') === 'true') {
        try {
            const storedData = localStorage.getItem('ucarga_reusable_trip');
            if (storedData) {
                const tripData = JSON.parse(storedData);
                
                const dataToSet = {
                    ...tripData,
                    pickupDate: tripData.pickupDate ? new Date(tripData.pickupDate) : undefined,
                    deliveryDate: tripData.deliveryDate ? new Date(tripData.deliveryDate) : undefined,
                    pickupDateTentative: tripData.pickupDateTentative ? new Date(tripData.pickupDateTentative) : undefined,
                    deliveryDateTentative: tripData.deliveryDateTentative ? new Date(tripData.deliveryDateTentative) : undefined,
                    biddingType: tripData.biddingType || 'auction',
                    // Clear time fields for reuse
                    pickupTime: '',
                    deliveryTime: '',
                    pickupTimeTentative: '',
                    deliveryTimeTentative: '',
                };

                form.reset(dataToSet);

                if (tripData.originCoords) {
                    setOriginMarker(tripData.originCoords);
                }
                if (tripData.destinationCoords) {
                    setDestinationMarker(tripData.destinationCoords);
                }

                toast({
                    title: "Información de viaje cargada",
                    description: "Los detalles del viaje anterior han sido rellenados. Por favor, completa las fechas, horarios y sube los nuevos documentos y fotos.",
                });

                // Clean up localStorage and URL
                localStorage.removeItem('ucarga_reusable_trip');
                const newUrl = `/running/new?role=${role || ''}`;
                window.history.replaceState(null, '', newUrl);
            }
        } catch (error) {
            console.error("Error parsing reused trip data from localStorage:", error);
            toast({
                title: "Error al cargar viaje",
                description: "No se pudo cargar la información del viaje a reutilizar.",
                variant: "destructive"
            });
        }
    }
  }, [searchParams, form, toast, role]);


  const setupAutocomplete = useCallback((inputRef: React.RefObject<HTMLInputElement>, setAutocomplete: (autocomplete: google.maps.places.Autocomplete) => void) => {
    if (isLoaded && inputRef.current) {
        const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
            fields: ["formatted_address", "geometry.location"],
            types: ["address"]
        });
        setAutocomplete(autocomplete);
    }
  }, [isLoaded]);

  const onPlaceChanged = useCallback((autocomplete: google.maps.places.Autocomplete | null, type: 'origin' | 'destination') => {
      if (autocomplete) {
          const place = autocomplete.getPlace();
          if (place && place.geometry && place.geometry.location) {
              const lat = place.geometry.location.lat();
              const lng = place.geometry.location.lng();
              const address = place.formatted_address || '';
              const field = type === 'origin' ? 'originAddress' : 'destinationAddress';
              const setMarker = type === 'origin' ? setOriginMarker : setDestinationMarker;
              
              form.setValue(field, address, { shouldValidate: true });
              setMarker({ lat, lng });

              if (mapRef.current) {
                  mapRef.current.panTo({ lat, lng });
                  mapRef.current.setZoom(15);
              }
          }
      }
  }, [form]);
  
  // Calculate directions
  useEffect(() => {
    if (isLoaded && originMarker && destinationMarker) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(originMarker.lat, originMarker.lng),
          destination: new window.google.maps.LatLng(destinationMarker.lat, destinationMarker.lng),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
            const route = result.routes[0];
            if (route && route.legs[0] && route.legs[0].distance) {
                const distanceInMeters = route.legs[0].distance.value;
                const distanceInKm = distanceInMeters / 1000;
                setDistance(distanceInKm);
                toast({
                    title: "Ruta Calculada",
                    description: `Distancia estimada: ${distanceInKm.toFixed(2)} km`
                })
            }
          } else {
             if (status === 'NOT_FOUND' || status === 'ZERO_RESULTS') {
                toast({
                    title: "No se pudo calcular la ruta",
                    description: "No se encontró una ruta entre el origen y el destino.",
                    variant: "destructive"
                });
             } else if (status === 'REQUEST_DENIED') {
                toast({
                    title: "Error de API de Google Maps",
                    description: "La API de Direcciones no está habilitada para tu proyecto. Por favor, actívala en la consola de Google Cloud.",
                    variant: "destructive",
                    duration: 10000,
                });
             } else {
                console.error("Error al obtener direcciones:", {result, status});
             }
          }
        }
      );
    }
  }, [isLoaded, originMarker, destinationMarker, toast]);

  useEffect(() => {
      if (originAutocomplete) {
          const listener = originAutocomplete.addListener('place_changed', () => onPlaceChanged(originAutocomplete, 'origin'));
          return () => window.google.maps.event.removeListener(listener);
      }
  }, [originAutocomplete, onPlaceChanged]);

  useEffect(() => {
      if (destinationAutocomplete) {
          const listener = destinationAutocomplete.addListener('place_changed', () => onPlaceChanged(destinationAutocomplete, 'destination'));
          return () => window.google.maps.event.removeListener(listener);
      }
  }, [destinationAutocomplete, onPlaceChanged]);

  useEffect(() => {
    setupAutocomplete(originInputRef, setOriginAutocomplete);
  }, [setupAutocomplete]);

  useEffect(() => {
    setupAutocomplete(destinationInputRef, setDestinationAutocomplete);
  }, [setupAutocomplete]);

  const onLoadMap = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmountMap = useCallback(() => {
    mapRef.current = null;
  }, []);
  
  const geocodeLatLng = useCallback((lat: number, lng: number, type: 'origin' | 'destination') => {
    if (!isLoaded) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
            const address = results[0].formatted_address;
            const field = type === 'origin' ? 'originAddress' : 'destinationAddress';
            form.setValue(field, address, { shouldValidate: true });
            toast({ title: type === 'origin' ? 'Origen actualizado' : 'Destino actualizado', description: address });
        } else {
            toast({ title: 'Error de geocodificación', description: 'No se pudo obtener la dirección para esta ubicación.', variant: 'destructive' });
        }
    });
}, [isLoaded, form, toast]);


  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (!event.latLng) return;
    const lat = event.latLng.lat();
    const lng = event.latLng.lng();
    
    if (!originMarker || (originMarker && destinationMarker)) {
        setDirections(null);
        setDistance(null);
        if (destinationMarker) {
            setDestinationMarker(null);
            form.setValue('destinationAddress', '', { shouldValidate: true });
        }
        setOriginMarker({ lat, lng });
        geocodeLatLng(lat, lng, 'origin');

    } else if (!destinationMarker) {
        setDestinationMarker({ lat, lng });
        geocodeLatLng(lat, lng, 'destination');
    }
}, [originMarker, destinationMarker, form, geocodeLatLng]);

  const onMarkerDragEnd = (event: google.maps.MapMouseEvent, type: 'origin' | 'destination') => {
      if (!event.latLng) return;
      const lat = event.latLng.lat();
      const lng = event.latLng.lng();

      if (type === 'origin') {
          setOriginMarker({ lat, lng });
          geocodeLatLng(lat, lng, 'origin');
      } else {
          setDestinationMarker({ lat, lng });
          geocodeLatLng(lat, lng, 'destination');
      }
  };


  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
        const files = Array.from(event.target.files);
        const remainingSlots = 5 - merchandisePhotos.length;
        if (files.length > remainingSlots) {
            toast({
                title: "Límite de fotos alcanzado",
                description: `Solo puedes subir ${remainingSlots} foto(s) más.`,
                variant: "destructive"
            });
        }
        const newPhotos = files.slice(0, remainingSlots);
        setMerchandisePhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const removePhoto = (index: number) => {
    setMerchandisePhotos(prev => prev.filter((_, i) => i !== index));
  }

  const handleFormSubmit = async () => {
    const isValid = await form.trigger();
    if (isValid) {
      setShowConfirmation(true);
    }
  };

  const executeSubmit = async () => {
    if (authLoading || !user) {
        toast({
            title: "Error de autenticación",
            description: "Debes iniciar sesión para crear un viaje.",
            variant: "destructive",
        });
        router.push('/auth');
        return;
    }
    
    setIsSubmitting(true);
    setShowConfirmation(false);

    let tripId: string | null = null;
    try {
        const rawData = form.getValues();
        const data = {
            ...rawData,
            totalWeight: parseFormattedNumber(String(rawData.totalWeight)),
            budget: parseFormattedNumber(String(rawData.budget)),
            merchandiseValue: rawData.merchandiseValue ? parseFormattedNumber(String(rawData.merchandiseValue)) : undefined,
            packageCount: parseFormattedNumber(String(rawData.packageCount)),
        };

        const originCity = data.originAddress.split(',').slice(-2).join(', ').trim() || 'Origen';
        const destCity = data.destinationAddress.split(',').slice(-2).join(', ').trim() || 'Destino';
        
        const formatDimension = (value?: number, unit?: string) => value && unit ? `${value}${unit}` : '';
        const dimensions = [
            formatDimension(data.length, data.lengthUnit),
            formatDimension(data.width, data.widthUnit),
            formatDimension(data.height, data.heightUnit)
        ].filter(Boolean).join(' x ') || 'No especificadas';

        const combineDateAndTime = (date: Date | undefined, time: string) => {
            if (!date || !(date instanceof Date) || isNaN(date.getTime())) {
                throw new Error("Invalid date provided to combineDateAndTime");
            }
            const [hours, minutes] = time.split(':');
            const newDate = new Date(date);
            newDate.setHours(parseInt(hours, 10));
            newDate.setMinutes(parseInt(minutes, 10));
            newDate.setSeconds(0, 0);
            return newDate.toISOString();
        }
        
        const combineOptionalDateAndTime = (date?: Date, time?: string) => {
            if (!date || !time) return undefined;
            return combineDateAndTime(date, time);
        }
        
        const newTripData: { [key: string]: any } = {
            creatorId: user.uid,
            shipmentId: `#${Math.floor(Math.random() * 900) + 100}-${originCity.substring(0,3).toUpperCase()}-${destCity.substring(0,3).toUpperCase()}`,
            status: 'Pendiente',
            cargoDescription: data.cargoDescription,
            cargoType: data.cargoType,
            otherCargoType: data.otherCargoType,
            totalWeight: data.totalWeight,
            weightUnit: data.weightUnit,
            volume: data.volume,
            dimensions: dimensions,
            packageCount: data.packageCount,
            packageType: data.packageType,
            packagingType: data.packagingType,
            otherPackagingType: data.otherPackagingType,
            merchandiseValue: data.merchandiseValue,
            merchandiseCurrency: data.merchandiseCurrency,
            requiresInsurance: data.requiresInsurance,
            isStackable: data.isStackable,
            isShared: data.isShared,
            merchandisePhotos: [], // Start with empty array
            origin: originCity,
            originAddress: data.originAddress,
            destination: destCity,
            destinationAddress: data.destinationAddress,
            pickupDate: combineDateAndTime(data.pickupDate, data.pickupTime),
            deliveryDate: combineDateAndTime(data.deliveryDate, data.deliveryTime),
            pickupDateTentative: combineOptionalDateAndTime(data.pickupDateTentative, data.pickupTimeTentative),
            deliveryDateTentative: combineOptionalDateAndTime(data.deliveryDateTentative, data.deliveryTimeTentative),
            biddingType: data.biddingType,
            paymentMethod: data.paymentMethod,
            otherPaymentMethod: data.otherPaymentMethod,
            paymentTiming: data.paymentTiming,
            paymentInstallments: data.paymentInstallments,
            budget: data.budget,
            observations: data.observations,
            truckType: data.truckType,
            otherTruckType: data.otherTruckType,
            requiresGps: data.requiresGps,
            requiresCarrierAssist: data.requiresCarrierAssist,
            requiresCrane: data.requiresCrane,
            requiresEscort: data.requiresEscort,
            destinationContact: data.destinationContact,
            miles: Math.floor(Math.random() * 1000) + 20,
            price: data.budget || 0,
            cargoDetails: `${data.cargoDescription}, ${data.packageCount} ${data.packageType}. Dimensiones: ${dimensions}`,
            addresses: { pickup: data.originAddress, delivery: data.destinationAddress },
            bidInfo: data.budget ? `Presupuesto: $${data.budget}` : 'Abierto a ofertas',
            estimatedTimes: [
              { label: 'ETA a Origen', time: `${format(data.pickupDate, 'PPP')} ${data.pickupTime}`, status: 'pending' },
              { label: 'Llegada a Destino Estimada', time: `${format(data.deliveryDate, 'PPP')} ${data.deliveryTime}`, status: 'pending' },
            ],
            notes: data.observations ? [{ author: 'Creador', message: data.observations, timestamp: new Date().toLocaleTimeString() }] : [],
            documents: [],
            weight: data.weightUnit === 'lb' ? data.totalWeight * 0.453592 : data.totalWeight,
            trailerType: data.truckType,
            routeType: data.routeType,
        };
        
        if (distance) {
            newTripData.distanceKm = distance;
        }
        if (originMarker) {
            newTripData.originCoords = originMarker;
        }
        if (destinationMarker) {
            newTripData.destinationCoords = destinationMarker;
        }
        if (data.requiredLicenseType) {
          newTripData.requiredLicenseType = data.requiredLicenseType;
        }
       
        // 1. Create the trip document first
        tripId = await addTrip(newTripData as Omit<Trip, 'id' | 'createdAt'>);
        if (!tripId) {
            throw new Error("Failed to create trip document. Aborting file uploads.");
        }
        toast({ title: 'Solicitud Creada', description: 'La solicitud de viaje ha sido guardada. Subiendo archivos...' });

        // 2. Prepare file uploads
        const photoUploadPromises = merchandisePhotos.map(async (file) => {
            const dataUrl = await fileToDataUrl(file);
            return uploadFileToServer(`trip_photos/${user!.uid}/${tripId}/${Date.now()}_${file.name}`, dataUrl);
        });

        const documentFiles = [
            { file: cartaPorteFile, type: 'Carta Porte' as const, visibility: data.cartaPorteVisibility },
            { file: fichaTecnicaFile, type: 'Ficha Técnica' as const, visibility: data.fichaTecnicaVisibility },
            { file: otroDocumentoFile, type: 'Otro' as const, visibility: data.otroDocumentoVisibility },
        ];
        
        const documentUploadPromises = documentFiles
            .filter(d => d.file)
            .map(async ({ file, type, visibility }) => {
                if (!file) return null; // Should not happen due to filter
                const dataUrl = await fileToDataUrl(file);
                const url = await uploadFileToServer(`trip_documents/${user!.uid}/${tripId}/${Date.now()}_${file.name}`, dataUrl);
                return {
                    name: file!.name,
                    url,
                    uploadedAt: new Date().toISOString(),
                    visibility,
                    type,
                } as TripDocument;
            });

        // 3. Execute all uploads in parallel
        const [photoUrls, uploadedDocs] = await Promise.all([
            Promise.all(photoUploadPromises),
            Promise.all(documentUploadPromises)
        ]);

        // 4. Update the trip document with all file URLs
        const validUploadedDocs = uploadedDocs.filter((doc): doc is TripDocument => doc !== null);
        if (photoUrls.length > 0 || validUploadedDocs.length > 0) {
            const updatePayload: Partial<Trip> = {};
            if (photoUrls.length > 0) updatePayload.merchandisePhotos = photoUrls;
            if (validUploadedDocs.length > 0) updatePayload.documents = validUploadedDocs;

            await updateTrip({ id: tripId, ...updatePayload });
            toast({ title: 'Archivos Subidos', description: 'Las imágenes y documentos se han asociado al viaje.' });
        }
        
        const redirectUrl = role === 'empresa' ? `/dashboard?role=empresa&created=true` : '/running?created=true';
        router.push(redirectUrl);
    } catch(e: any) {
        console.error("Error creating trip:", e);
        toast({ title: 'Error al crear', description: e.message || 'No se pudo guardar la solicitud. Por favor, inténtalo de nuevo.', variant: 'destructive'});
        // Attempt to delete the trip document if it was created but something failed afterwards
        if (tripId) {
            await deleteTrip(tripId).catch(delErr => console.error("Failed to clean up trip document after error:", delErr));
        }
    } finally {
        setIsSubmitting(false);
    }
  };
  
  const backUrl = role === 'empresa' ? `/dashboard?role=empresa` : '/running';
  
  const singleFileHandler = (setter: (file: File | null) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      setter(e.target.files ? e.target.files[0] : null);
  };


  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={backUrl}>
              <ArrowLeft className="h-6 w-6" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-primary">Crear Solicitud de Viaje</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={(e) => { e.preventDefault(); handleFormSubmit(); }} className="space-y-8">
          
          {/* Datos de la Carga */}
          <Card>
            <CardHeader>
              <CardTitle>📦 Datos de la carga</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <FormField control={form.control} name="cargoDescription" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción de la carga</FormLabel>
                    <FormControl><Textarea placeholder="Ej: 2 pallets de cajas con equipo de cómputo, frágil." {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}/>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="cargoType" render={({ field }) => (
                        <FormItem><FormLabel>Categoría de carga</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona una categoría..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Maquinaria pesada">Maquinaria pesada</SelectItem>
                                    <SelectItem value="Mercancía comercial">Mercancía comercial</SelectItem>
                                    <SelectItem value="Contenedores">Contenedores</SelectItem>
                                    <SelectItem value="Carga refrigerada">Carga refrigerada</SelectItem>
                                    <SelectItem value="Ganado">Ganado</SelectItem>
                                    <SelectItem value="Instrumentos musicales">Instrumentos musicales</SelectItem>
                                    <SelectItem value="Vehículos">Vehículos</SelectItem>
                                    <SelectItem value="Muebles">Muebles</SelectItem>
                                    <SelectItem value="Obras de arte">Obras de arte</SelectItem>
                                    <SelectItem value="Otros">Otros</SelectItem>
                                </SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )}/>
                    <OtherCargoTypeField control={form.control} />
                    <FormItem>
                        <FormLabel>Peso total</FormLabel>
                        <div className="flex gap-2">
                            <FormField control={form.control} name="totalWeight" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                        <Input
                                          type="text"
                                          inputMode="decimal"
                                          placeholder="1,200"
                                          {...field}
                                          value={formatNumber(field.value)}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="weightUnit" render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-[80px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="kg">kg</SelectItem>
                                            <SelectItem value="lb">lb</SelectItem>
                                            <SelectItem value="ton">ton</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </FormItem>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                         <FormField control={form.control} name="length" render={({ field }) => (
                            <FormItem><FormLabel>Largo</FormLabel><FormControl><Input type="number" placeholder="1.2" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="width" render={({ field }) => (
                            <FormItem><FormLabel>Ancho</FormLabel><FormControl><Input type="number" placeholder="1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <FormField control={form.control} name="height" render={({ field }) => (
                            <FormItem><FormLabel>Alto</FormLabel><FormControl><Input type="number" placeholder="1.5" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                         )}/>
                         <div className="md:col-span-3">
                            <FormLabel>Unidad de Medida</FormLabel>
                            <Select onValueChange={handleUnitChange} value={form.watch('lengthUnit')}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mm">mm</SelectItem>
                                    <SelectItem value="cm">cm</SelectItem>
                                    <SelectItem value="m">m</SelectItem>
                                    <SelectItem value="km">km</SelectItem>
                                    <SelectItem value="in">in</SelectItem>
                                    <SelectItem value="ft">ft</SelectItem>
                                    <SelectItem value="yd">yd</SelectItem>
                                    <SelectItem value="mi">mi</SelectItem>
                                </SelectContent>
                            </Select>
                         </div>
                    </div>
                    <FormField control={form.control} name="volume" render={({ field }) => (
                        <FormItem><FormLabel>Volumen (m³)</FormLabel>
                        <FormControl><Input type="number" placeholder="1.8" {...field} value={field.value ?? ''} /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                    <FormItem>
                        <FormLabel>Cantidad</FormLabel>
                        <div className="flex gap-2">
                            <FormField control={form.control} name="packageCount" render={({ field }) => (
                                <FormItem className="flex-1">
                                    <FormControl>
                                       <Input
                                          type="text"
                                          inputMode="numeric"
                                          placeholder="24"
                                          {...field}
                                          value={formatNumber(field.value)}
                                          onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="packageType" render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-[180px]">
                                                <SelectValue placeholder="Tipo de unidad" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="pieza">Pieza (pc/pieza/unit)</SelectItem>
                                            <SelectItem value="set">Set / Kit</SelectItem>
                                            <SelectItem value="paquete">Paquete (pack)</SelectItem>
                                            <SelectItem value="docena">Docena (dz)</SelectItem>
                                            <SelectItem value="par">Par (pair)</SelectItem>
                                            <SelectItem value="caja">Caja (box / carton)</SelectItem>
                                            <SelectItem value="bulto">Bulto (bag / sack)</SelectItem>
                                            <SelectItem value="rollo">Rollo (roll)</SelectItem>
                                            <SelectItem value="pallet">Tarima o Pallet (pallet / skid)</SelectItem>
                                            <SelectItem value="tambor">Tambor (drum / barrel)</SelectItem>
                                            <SelectItem value="master_box">Caja Máster</SelectItem>
                                            <SelectItem value="contenedor">Contenedor (container)</SelectItem>
                                            <SelectItem value="ton_kg">Tonelada / Kilogramo</SelectItem>
                                            <SelectItem value="litro_galon">Litro / Galón</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </FormItem>
                    <FormField control={form.control} name="packagingType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de cajas / embalaje</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecciona un tipo de embalaje..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Cartón corrugado">Cartón corrugado</SelectItem>
                                    <SelectItem value="Cartón sólido o microcorrugado">Cartón sólido o microcorrugado</SelectItem>
                                    <SelectItem value="Madera">Madera – Muy resistente</SelectItem>
                                    <SelectItem value="Metálica">Metálica – Alta protección</SelectItem>
                                    <SelectItem value="Plástica">Plástica (polietileno o polipropileno)</SelectItem>
                                    <SelectItem value="Compuesta (mixta)">Compuesta (mixta)</SelectItem>
                                    <SelectItem value="Otro">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )}/>
                    <OtherPackagingTypeField control={form.control} />
                     <FormItem>
                        <FormLabel>Valor de la mercancía (opcional)</FormLabel>
                        <div className="flex gap-2">
                            <FormField control={form.control} name="merchandiseValue" render={({ field }) => (
                                <FormItem className="flex-1">
                                     <FormControl>
                                        <Input 
                                            type="text"
                                            inputMode="decimal"
                                            placeholder="250,000"
                                            {...field}
                                            value={formatNumber(field.value) || ''}
                                            onChange={(e) => field.onChange(e.target.value)}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="merchandiseCurrency" render={({ field }) => (
                                <FormItem>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="w-[100px]">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="MXN">MXN</SelectItem>
                                            <SelectItem value="USD">USD</SelectItem>
                                            <SelectItem value="EUR">EUR</SelectItem>
                                            <SelectItem value="JPY">JPY</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}/>
                        </div>
                    </FormItem>
                     <FormField control={form.control} name="requiresInsurance" render={({ field }) => (
                        <FormItem><FormLabel>¿Requiere seguro?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="isStackable" render={({ field }) => (
                        <FormItem><FormLabel>¿Es apilable?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="isShared" render={({ field }) => (
                        <FormItem><FormLabel>¿Puede ser viaje compartido?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                </div>
            </CardContent>
          </Card>

          {/* Origen y Destino */}
          <Card>
             <CardHeader><CardTitle>📍 Origen y Destino</CardTitle></CardHeader>
             <CardContent className="space-y-4">
                  {loadError && <div>Error al cargar el mapa. Por favor, revisa tu clave de API.</div>}
                  {!isLoaded ? (
                    <div className="flex items-center justify-center h-[400px]"><Loader2 className="h-8 w-8 animate-spin" />Cargando mapa...</div>
                  ) : (
                    <>
                      <GoogleMap
                          mapContainerStyle={mapContainerStyle}
                          center={center}
                          zoom={5}
                          onLoad={onLoadMap}
                          onUnmount={onUnmountMap}
                          onClick={handleMapClick}
                      >
                          {directions && <DirectionsRenderer directions={directions} options={{ suppressMarkers: true }} />}
                          {originMarker && <MarkerF position={originMarker} label="O" draggable={true} onDragEnd={(e) => onMarkerDragEnd(e, 'origin')} />}
                          {destinationMarker && <MarkerF position={destinationMarker} label="D" draggable={true} onDragEnd={(e) => onMarkerDragEnd(e, 'destination')} />}
                      </GoogleMap>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField control={form.control} name="originAddress" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Dirección de Origen</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Escribe y selecciona la dirección de origen..." ref={originInputRef} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                        <FormField control={form.control} name="destinationAddress" render={({ field }) => (
                           <FormItem>
                                <FormLabel>Dirección de Destino</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="Escribe y selecciona la dirección de destino..." ref={destinationInputRef} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>
                      </div>
                    </>
                  )}
                 <Separator className="my-6"/>
                 <div className="space-y-6">
                    <div>
                        <FormLabel className="text-base">Horarios de Carga</FormLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                             <FormField control={form.control} name="pickupDate" render={({ field }) => (
                              <FormItem className="flex flex-col"><FormLabel>Fecha de Carga</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Elige fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                </Popover><FormMessage />
                              </FormItem>
                            )}/>
                            <FormField control={form.control} name="pickupTime" render={({ field }) => (
                              <FormItem className="flex flex-col"><FormLabel>Hora de Carga</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                            <FormField control={form.control} name="pickupDateTentative" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Otra Fecha (Opcional)</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                        {field.value ? format(field.value, "PPP") : <span>Elige fecha</span>}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                    </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                </Popover><FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="pickupTimeTentative" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Otra Hora (Opcional)</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>
                     <div>
                        <FormLabel className="text-base">Horarios de Entrega</FormLabel>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                            <FormField control={form.control} name="deliveryDate" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Fecha de Entrega</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Elige fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="deliveryTime" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Hora de Entrega</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="deliveryDateTentative" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Otra Fecha (Opcional)</FormLabel>
                                    <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                        <Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                            {field.value ? format(field.value, "PPP") : <span>Elige fecha</span>}
                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                        </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus/></PopoverContent>
                                    </Popover><FormMessage />
                                </FormItem>
                            )}/>
                            <FormField control={form.control} name="deliveryTimeTentative" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Otra Hora (Opcional)</FormLabel><FormControl><Input type="time" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                    </div>
                 </div>
             </CardContent>
          </Card>

          {/* Condiciones y Extras */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="flex-1">
                <CardHeader><CardTitle>💲 Condiciones de la Oferta</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField
                        control={form.control}
                        name="biddingType"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel>Modalidad de Oferta</FormLabel>
                            <FormControl>
                            <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex flex-col space-y-2">
                                <TooltipProvider delayDuration={100}>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="fixed" id="r-fixed" />
                                        <Label htmlFor="r-fixed" className="font-normal flex items-center gap-2">
                                            Precio Fijo
                                            <Tooltip>
                                                <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                <TooltipContent><p>El transportista no podrá ofertar, el precio es final.</p></TooltipContent>
                                            </Tooltip>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="auction" id="r-auction" />
                                        <Label htmlFor="r-auction" className="font-normal flex items-center gap-2">
                                            Subasta
                                             <Tooltip>
                                                <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                <TooltipContent><p>El transportista solo podrá ofertar un monto menor al establecido.</p></TooltipContent>
                                            </Tooltip>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="competition" id="r-competition" />
                                        <Label htmlFor="r-competition" className="font-normal flex items-center gap-2">
                                            Competencia
                                             <Tooltip>
                                                <TooltipTrigger><HelpCircle className="h-4 w-4 text-muted-foreground" /></TooltipTrigger>
                                                <TooltipContent><p>El transportista puede ofertar un monto mayor o menor al establecido.</p></TooltipContent>
                                            </Tooltip>
                                        </Label>
                                    </div>
                                </TooltipProvider>
                            </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField control={form.control} name="paymentMethod" render={({ field }) => (
                        <FormItem><FormLabel>Forma de pago</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="transferencia">Transferencia</SelectItem>
                                    <SelectItem value="efectivo">Efectivo</SelectItem>
                                    <SelectItem value="credito">Crédito</SelectItem>
                                    <SelectItem value="cheque">Cheque</SelectItem>
                                    <SelectItem value="otros">Otros</SelectItem>
                                </SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )}/>
                    <OtherPaymentField control={form.control} />
                     <FormField control={form.control} name="paymentTiming" render={({ field }) => (
                        <FormItem><FormLabel>Momento del pago</FormLabel>
                            <FormControl>
                                <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="inmediato" /></FormControl><FormLabel className="font-normal">Pago Inmediato</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="contra entrega" /></FormControl><FormLabel className="font-normal">Pago Contra Entrega</FormLabel></FormItem>
                                    <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="credito" /></FormControl><FormLabel className="font-normal">pago a crédito</FormLabel></FormItem>
                                </RadioGroup>
                            </FormControl>
                        </FormItem>
                    )}/>
                    <PaymentInstallmentsField control={form.control} />
                     <FormField control={form.control} name="budget" render={({ field }) => (
                        <FormItem><FormLabel>Monto a pagar por transportista</FormLabel>
                        <FormControl>
                           <Input 
                                type="text"
                                inputMode="decimal"
                                placeholder="25,000"
                                {...field}
                                value={formatNumber(field.value)}
                                onChange={(e) => field.onChange(e.target.value)}
                           />
                        </FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                     <FormField control={form.control} name="observations" render={({ field }) => (
                        <FormItem><FormLabel>Observaciones</FormLabel>
                        <FormControl><Textarea placeholder="Ej: se requiere montacargas, horarios de entrega restringidos..." {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </CardContent>
            </Card>
            <Card className="flex-1">
                <CardHeader><CardTitle>🚚 Extras para Transportistas</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <FormField control={form.control} name="truckType" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de camión requerido</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="Camioneta pick-up">Camioneta pick-up</SelectItem>
                                    <SelectItem value="Camión tipo panel (van)">Camión tipo panel (van)</SelectItem>
                                    <SelectItem value="Camión rabón">Camión rabón</SelectItem>
                                    <SelectItem value="Camión de redilas mediano">Camión de redilas mediano</SelectItem>
                                    <SelectItem value="Camión torton">Camión torton</SelectItem>
                                    <SelectItem value="Tráiler (tractocamión con caja seca o plataforma)">Tráiler (tractocamión con caja seca o plataforma)</SelectItem>
                                    <SelectItem value="Camión caja seca">Camión caja seca</SelectItem>
                                    <SelectItem value="Camión refrigerado">Camión refrigerado</SelectItem>
                                    <SelectItem value="Camión de redilas">Camión de redilas</SelectItem>
                                    <SelectItem value="Camión plataforma">Camión plataforma</SelectItem>
                                    <SelectItem value="Camión cisterna (pipa)">Camión cisterna (pipa)</SelectItem>
                                    <SelectItem value="Camión de volteo">Camión de volteo</SelectItem>
                                    <SelectItem value="Camión jaula ganadera 🐄">Camión jaula ganadera 🐄</SelectItem>
                                    <SelectItem value="Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅">Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅</SelectItem>
                                    <SelectItem value="Rabón">Rabón</SelectItem>
                                    <SelectItem value="Torton">Torton</SelectItem>
                                    <SelectItem value="Tractocamión con caja seca, plataforma o jaula">Tractocamión con caja seca, plataforma o jaula</SelectItem>
                                    <SelectItem value="otro">Otro</SelectItem>
                                </SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )}/>
                    <OtherTruckTypeField control={form.control} />
                    <FormField control={form.control} name="requiredLicenseType" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Licencia Federal requerida</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo de licencia" /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="B">Tipo "B"</SelectItem>
                                    <SelectItem value="C">Tipo "C" (Materiales peligrosos)</SelectItem>
                                    <SelectItem value="E">Tipo "E" (Doble remolque)</SelectItem>
                                </SelectContent>
                            </Select><FormMessage />
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="routeType" render={({ field }) => (
                        <FormItem><FormLabel>Tipo de Ruta</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="caseta" /></FormControl><FormLabel className="font-normal">Caseta</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="libre" /></FormControl><FormLabel className="font-normal">Libre</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="requiresGps" render={({ field }) => (
                        <FormItem><FormLabel>¿Requiere rastreo satelital?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                     <FormField control={form.control} name="requiresCarrierAssist" render={({ field }) => (
                        <FormItem><FormLabel>¿Ayuda en carga/descarga?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="requiresCrane" render={({ field }) => (
                        <FormItem><FormLabel>¿Se requiere grúa?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="requiresEscort" render={({ field }) => (
                        <FormItem><FormLabel>¿Requiere seguridad / escolta?</FormLabel>
                            <FormControl><RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2">
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup></FormControl>
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="destinationContact" render={({ field }) => (
                        <FormItem><FormLabel>Contacto en Destino</FormLabel>
                        <FormControl><Input placeholder="Nombre y teléfono" {...field} /></FormControl>
                        <FormMessage /></FormItem>
                    )}/>
                </CardContent>
            </Card>
          </div>

          {/* Documentos */}
            <Card>
                <CardHeader>
                <CardTitle>📄 Documentos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FileUploadRow 
                        label="Carta Porte" 
                        fieldName="cartaPorteVisibility" 
                        file={cartaPorteFile}
                        onFileChange={singleFileHandler(setCartaPorteFile)}
                        onFileRemove={() => setCartaPorteFile(null)}
                        control={form.control}
                        disabled={isSubmitting}
                    />
                     <FileUploadRow 
                        label="Ficha Técnica de la Carga" 
                        fieldName="fichaTecnicaVisibility" 
                        file={fichaTecnicaFile}
                        onFileChange={singleFileHandler(setFichaTecnicaFile)}
                        onFileRemove={() => setFichaTecnicaFile(null)}
                        control={form.control}
                        disabled={isSubmitting}
                    />
                     <FileUploadRow 
                        label="Otro Documento" 
                        fieldName="otroDocumentoVisibility" 
                        file={otroDocumentoFile}
                        onFileChange={singleFileHandler(setOtroDocumentoFile)}
                        onFileRemove={() => setOtroDocumentoFile(null)}
                        control={form.control}
                        disabled={isSubmitting}
                    />
                    <p className="text-sm text-muted-foreground pt-2">Nota: Los documentos marcados como "privados" solo se enviarán al transportista una vez que la oferta sea aceptada. Los "públicos" son visibles para todos.</p>
                </CardContent>
            </Card>
            
            {/* Fotos de la Mercancía */}
            <Card>
                <CardHeader>
                <CardTitle>📷 Fotos de la mercancía</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-lg border p-4">
                        {merchandisePhotos.length > 0 && (
                             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-4">
                                {merchandisePhotos.map((photo, index) => (
                                    <div key={index} className="relative group">
                                        <Image src={URL.createObjectURL(photo)} alt={`merchandise photo ${index + 1}`} width={150} height={150} className="rounded-md object-cover aspect-square" />
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="icon"
                                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => removePhoto(index)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md">
                             <input
                                type="file"
                                ref={photoInputRef}
                                onChange={handlePhotoUpload}
                                accept="image/*"
                                multiple
                                className="hidden"
                                disabled={merchandisePhotos.length >= 5 || authLoading || isSubmitting}
                            />
                             <Button
                                type="button"
                                variant="outline"
                                onClick={() => photoInputRef.current?.click()}
                                disabled={merchandisePhotos.length >= 5 || authLoading || isSubmitting}
                            >
                                <Camera className="mr-2 h-4 w-4" />
                                Subir fotos ({merchandisePhotos.length}/5)
                            </Button>
                            {merchandisePhotos.length === 0 && <p className="mt-2 text-xs text-muted-foreground">No se han subido fotos.</p>}
                        </div>
                    </div>
                    <p className="text-sm text-muted-foreground pt-2">Nota: Estas fotos serán públicas para todos los transportistas.</p>

                </CardContent>
            </Card>
          
          <div className="flex justify-center pt-4">
            <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
              <AlertDialogTrigger asChild>
                <Button type="button" size="lg" disabled={authLoading || isSubmitting} onClick={handleFormSubmit}>
                  {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Solicitud</>}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás seguro de publicar?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Una vez publicada, la solicitud de viaje será visible para los transportistas y no podrá ser editada. ¿Deseas continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={executeSubmit}>Publicar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function CreateTripPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <CreateTripPageContent />
        </Suspense>
    );
}
