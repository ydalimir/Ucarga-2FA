

'use client';

import { Suspense, useCallback, useState, useRef, ChangeEvent } from 'react';
import { useForm, useWatch, Control } from 'react-hook-form';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTrips } from '@/context/trips-context';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { useEffect } from 'react';
import type { CarrierProfileData, Driver, Vehicle, Trailer } from '@/lib/types';
import { ArrowLeft, PlusCircle, Trash2, Loader2, User, Truck, Package, ShieldCheck, Edit, Save, Upload, X, File, Paperclip, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { uploadFileToServer } from '@/lib/server-actions';

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const PhotoUpload = ({ file, onFileSelect, existingUrl, label = 'Foto de Perfil', isVehicle = false, isTrailer = false }: { file: File | null; onFileSelect: (file: File | null) => void; existingUrl?: string; label?: string, isVehicle?: boolean, isTrailer?: boolean }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [previewUrl, setPreviewUrl] = useState<string | null>(existingUrl || null);

    useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreviewUrl(existingUrl || null);
        }
    }, [file, existingUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) { // 2MB limit
                toast({ title: "Archivo muy grande", description: "La imagen no debe superar los 2MB.", variant: "destructive" });
                return;
            }
            onFileSelect(file);
        }
    };
    
    const Icon = isVehicle ? <Truck className="h-10 w-10 text-muted-foreground" /> : isTrailer ? <Package className="h-10 w-10 text-muted-foreground" /> : <User className="h-10 w-10 text-muted-foreground" />;

    return (
        <FormItem className="flex flex-col items-center gap-4 col-span-1 md:col-span-2">
            <FormLabel>{label}</FormLabel>
             <div className="relative h-24 w-32 border-2 border-dashed rounded-md flex items-center justify-center">
                {previewUrl ? (
                    <Image src={previewUrl} alt="Vista previa" layout="fill" className="object-contain rounded-md" />
                ) : (
                    Icon
                )}
            </div>
            <input type="file" ref={inputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir Foto
                </Button>
                {previewUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => { onFileSelect(null); setPreviewUrl(null); }}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Quitar
                    </Button>
                )}
            </div>
        </FormItem>
    );
};


const DocumentUpload = ({ label, onFileSelect, file, onFileRemove, existingUrl, existingFileName }: { label: string, onFileSelect: (file: File) => void, file: File | null, onFileRemove: () => void, existingUrl?: string, existingFileName?: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const triggerInput = () => inputRef.current?.click();
    
    const displayName = file?.name || existingFileName;

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    ref={inputRef}
                    accept="image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                        if (e.target.files?.[0]) {
                            onFileSelect(e.target.files[0]);
                        }
                    }}
                />
                <Button type="button" variant="outline" size="sm" onClick={triggerInput}>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir
                </Button>
                {displayName ? (
                     <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded-md">
                        <a href={file ? URL.createObjectURL(file) : existingUrl} download={displayName} className="flex items-center gap-2 hover:underline" target="_blank" rel="noopener noreferrer">
                            <Paperclip className="h-4 w-4" />
                            <span className="truncate max-w-[150px]">{displayName}</span>
                        </a>
                         <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onFileRemove}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : null}
            </div>
            <FormMessage />
        </FormItem>
    );
};


const driverFormSchema = z.object({
  name: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos.'),
  operatorNumber: z.string().optional(),
  
  licenseNumber: z.string().min(1, "El número de licencia es obligatorio."),
  licenseType: z.enum(['B', 'E']),
  licenseExpirationDate: z.string().min(1, "La fecha de vencimiento es obligatoria."),

  curp: z.string().optional(),
  rfc: z.string().optional(),
  proofOfAddress: z.string().optional(),
});

type DriverFormValues = z.infer<typeof driverFormSchema>;

const generateId = () => `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

function DriverForm({ onFormSubmit, userId, existingDriver }: { onFormSubmit: (data: Driver) => void, userId: string, existingDriver?: Driver }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // File states
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
    const [idBackFile, setIdBackFile] = useState<File | null>(null);
    const [licenseFrontFile, setLicenseFrontFile] = useState<File | null>(null);
    const [licenseBackFile, setLicenseBackFile] = useState<File | null>(null);
    const [criminalRecordFile, setCriminalRecordFile] = useState<File | null>(null);
    const [medicalExamFile, setMedicalExamFile] = useState<File | null>(null);
    const [lifeInsuranceFile, setLifeInsuranceFile] = useState<File | null>(null);
    const [trainingCertFile, setTrainingCertFile] = useState<File | null>(null);
    const [noInfractionsFile, setNoInfractionsFile] = useState<File | null>(null);
    
    const form = useForm<DriverFormValues>({
        resolver: zodResolver(driverFormSchema),
        defaultValues: existingDriver ? {
            ...existingDriver,
            licenseNumber: existingDriver.license?.licenseNumber || '',
            licenseType: existingDriver.license?.licenseType || 'B',
            licenseExpirationDate: existingDriver.license?.expirationDate || '',
        } : { name: '', phone: '', operatorNumber: '', curp: '', rfc: '', licenseNumber: '', licenseType: 'B', licenseExpirationDate: '', proofOfAddress: '' },
    });
    
    useEffect(() => {
        if(existingDriver) {
            form.reset({
                ...existingDriver,
                licenseNumber: existingDriver.license?.licenseNumber || '',
                licenseType: existingDriver.license?.licenseType || 'B',
                licenseExpirationDate: existingDriver.license?.expirationDate || '',
            });
        }
    }, [existingDriver, form]);

    const resetFormState = () => {
        form.reset();
        setPhotoFile(null);
        setIdFrontFile(null);
        setIdBackFile(null);
        setLicenseFrontFile(null);
        setLicenseBackFile(null);
        setCriminalRecordFile(null);
        setMedicalExamFile(null);
        setLifeInsuranceFile(null);
        setTrainingCertFile(null);
        setNoInfractionsFile(null);
        setOpen(false);
        setIsSubmitting(false);
    };

    const onSubmit = async (data: DriverFormValues) => {
        setIsSubmitting(true);
        const driverId = existingDriver?.id || generateId();

        try {
            const upload = async (file: File | null, type: string): Promise<{ url: string; name: string } | undefined> => {
                if (!file) return undefined;
                const dataUrl = await fileToDataUrl(file);
                const filePath = `drivers/${userId}/${driverId}/${type}_${file.name}`;
                const url = await uploadFileToServer(filePath, dataUrl);
                return { url, name: file.name };
            };

            const [
                photo,
                idFront, 
                idBack, 
                licenseFront, 
                licenseBack,
                criminalRecord,
                medicalExam,
                lifeInsurance,
                trainingCert,
                noInfractions
            ] = await Promise.all([
                upload(photoFile, 'profile_photo'),
                upload(idFrontFile, 'id_front'),
                upload(idBackFile, 'id_back'),
                upload(licenseFrontFile, 'license_front'),
                upload(licenseBackFile, 'license_back'),
                upload(criminalRecordFile, 'criminal_record'),
                upload(medicalExamFile, 'medical_exam'),
                upload(lifeInsuranceFile, 'life_insurance'),
                upload(trainingCertFile, 'training_cert'),
                upload(noInfractionsFile, 'no_infractions_cert'),
            ]);
            
            const newDriver: Driver = {
                id: driverId,
                name: data.name,
                phone: data.phone,
                operatorNumber: data.operatorNumber,
                photoURL: photo?.url || existingDriver?.photoURL,
                curp: data.curp,
                rfc: data.rfc,
                proofOfAddress: data.proofOfAddress,
                identityDocument: { 
                    frontUrl: idFront?.url || existingDriver?.identityDocument?.frontUrl,
                    frontName: idFront?.name || existingDriver?.identityDocument?.frontName,
                    backUrl: idBack?.url || existingDriver?.identityDocument?.backUrl,
                    backName: idBack?.name || existingDriver?.identityDocument?.backName,
                },
                license: { 
                    licenseNumber: data.licenseNumber,
                    licenseType: data.licenseType,
                    expirationDate: data.licenseExpirationDate,
                    frontScanUrl: licenseFront?.url || existingDriver?.license?.frontScanUrl,
                    frontScanName: licenseFront?.name || existingDriver?.license?.frontScanName,
                    backScanUrl: licenseBack?.url || existingDriver?.license?.backScanUrl,
                    backScanName: licenseBack?.name || existingDriver?.license?.backScanName,
                },
                criminalRecordCert: criminalRecord || existingDriver?.criminalRecordCert,
                medicalExam: medicalExam || existingDriver?.medicalExam,
                lifeInsurance: lifeInsurance || existingDriver?.lifeInsurance,
                trainingCert: trainingCert || existingDriver?.trainingCert,
                noInfractionsCert: noInfractions || existingDriver?.noInfractionsCert,
            };

            onFormSubmit(newDriver);
            toast({ title: existingDriver ? "Conductor actualizado" : "Conductor añadido", description: "La información del conductor ha sido guardada." });
            resetFormState();
        } catch (error) {
            console.error("Error saving driver:", error);
            toast({ title: "Error", description: "No se pudo guardar la información del conductor.", variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    const trigger = existingDriver ? (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /></Button>
    ) : (
        <Button onClick={() => setOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Conductor</Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{existingDriver ? 'Editar Conductor' : 'Añadir Nuevo Conductor'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                            <div className="space-y-4">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Nombre Completo</FormLabel><FormControl><Input {...field} placeholder="Nombre del conductor" /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Teléfono de Contacto</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="operatorNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Número de Operador (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                             <div className="row-start-1 md:col-start-2 flex justify-center">
                               <PhotoUpload file={photoFile} onFileSelect={setPhotoFile} existingUrl={existingDriver?.photoURL} label="Foto de Perfil" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                            <FormField control={form.control} name="rfc" render={({ field }) => (
                                <FormItem><FormLabel>RFC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                             <FormField control={form.control} name="curp" render={({ field }) => (
                                <FormItem><FormLabel>CURP</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )}/>
                              <FormField control={form.control} name="proofOfAddress" render={({ field }) => (
                                <FormItem className="md:col-span-2"><FormLabel>Domicilio</FormLabel><FormControl><Input {...field} placeholder="Dirección completa" /></FormControl><FormMessage /></FormItem>
                            )}/>
                        </div>
                        
                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-primary">Licencia Federal</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField control={form.control} name="licenseNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Número de Licencia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="licenseType" render={({ field }) => (
                                     <FormItem><FormLabel>Tipo</FormLabel>
                                       <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="B">Tipo "B"</SelectItem>
                                            <SelectItem value="E">Tipo "E"</SelectItem>
                                        </SelectContent>
                                      </Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="licenseExpirationDate" render={({ field }) => (
                                    <FormItem><FormLabel>Fecha de Vencimiento</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <DocumentUpload label="Anverso de la Licencia" file={licenseFrontFile} onFileSelect={setLicenseFrontFile} onFileRemove={() => setLicenseFrontFile(null)} existingUrl={existingDriver?.license?.frontScanUrl} existingFileName={existingDriver?.license?.frontScanName}/>
                               <DocumentUpload label="Reverso de la Licencia" file={licenseBackFile} onFileSelect={setLicenseBackFile} onFileRemove={() => setLicenseBackFile(null)} existingUrl={existingDriver?.license?.backScanUrl} existingFileName={existingDriver?.license?.backScanName} />
                            </div>
                        </div>

                         <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-primary">Identificación Oficial (INE)</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <DocumentUpload label="Anverso de la Identificación" file={idFrontFile} onFileSelect={setIdFrontFile} onFileRemove={() => setIdFrontFile(null)} existingUrl={existingDriver?.identityDocument?.frontUrl} existingFileName={existingDriver?.identityDocument?.frontName}/>
                               <DocumentUpload label="Reverso de la Identificación" file={idBackFile} onFileSelect={setIdBackFile} onFileRemove={() => setIdBackFile(null)} existingUrl={existingDriver?.identityDocument?.backUrl} existingFileName={existingDriver?.identityDocument?.backName} />
                            </div>
                        </div>
                        
                         <div className="space-y-4 pt-4 border-t">
                             <h4 className="font-semibold text-primary">Otros Documentos</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <DocumentUpload label="Carta de Antecedentes No Penales" file={criminalRecordFile} onFileSelect={setCriminalRecordFile} onFileRemove={() => setCriminalRecordFile(null)} existingUrl={existingDriver?.criminalRecordCert?.url} existingFileName={existingDriver?.criminalRecordCert?.name} />
                                <DocumentUpload label="Examen Médico Vigente" file={medicalExamFile} onFileSelect={setMedicalExamFile} onFileRemove={() => setMedicalExamFile(null)} existingUrl={existingDriver?.medicalExam?.url} existingFileName={existingDriver?.medicalExam?.name} />
                                <DocumentUpload label="Seguro de Vida/Accidentes" file={lifeInsuranceFile} onFileSelect={setLifeInsuranceFile} onFileRemove={() => setLifeInsuranceFile(null)} existingUrl={existingDriver?.lifeInsurance?.url} existingFileName={existingDriver?.lifeInsurance?.name} />
                                <DocumentUpload label="Constancia de Capacitación" file={trainingCertFile} onFileSelect={setTrainingCertFile} onFileRemove={() => setTrainingCertFile(null)} existingUrl={existingDriver?.trainingCert?.url} existingFileName={existingDriver?.trainingCert?.name} />
                                <DocumentUpload label="Carta de No Infracciones (Opcional)" file={noInfractionsFile} onFileSelect={setNoInfractionsFile} onFileRemove={() => setNoInfractionsFile(null)} existingUrl={existingDriver?.noInfractionsCert?.url} existingFileName={existingDriver?.noInfractionsCert?.name} />
                            </div>
                        </div>

                        <DialogFooter className="pt-6">
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {existingDriver ? 'Actualizar Conductor' : 'Guardar Conductor'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const OtherVehicleTypeField = ({ control }: { control: Control<VehicleFormValues> }) => {
    const type = useWatch({ control, name: 'type' });
    if (type !== 'otro') return null;
    return (
        <FormField control={control} name="otherType" render={({ field }) => (
            <FormItem>
                <FormLabel>Especificar otro tipo</FormLabel>
                <FormControl><Input {...field} placeholder="Ej: Camioneta 3.5 toneladas" /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};

const GpsLinkField = ({ control }: { control: Control<VehicleFormValues> }) => {
    const hasGps = useWatch({ control, name: 'hasGps' });
    if (hasGps !== 'yes') return null;
    return (
        <FormField control={control} name="gpsLink" render={({ field }) => (
            <FormItem className="col-span-1 md:col-span-2">
                <FormLabel>Enlace de Rastreo GPS</FormLabel>
                <FormControl><Input {...field} placeholder="https://ejemplo.com/rastreo/123" /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};


const OtherTrailerTypeField = ({ control }: { control: Control<TrailerFormValues> }) => {
    const type = useWatch({ control, name: 'type' });
    if (type !== 'Otro') return null;
    return (
        <FormField control={control} name="otherType" render={({ field }) => (
            <FormItem>
                <FormLabel>Especificar otro tipo</FormLabel>
                <FormControl><Input {...field} placeholder="Ej: Cama baja" /></FormControl>
                <FormMessage />
            </FormItem>
        )}/>
    );
};

const vehicleFormSchema = z.object({
  type: z.enum(['Camioneta pick-up', 'Camión tipo panel (van)', 'Camión rabón', 'Camión de redilas mediano', 'Camión torton', 'Tráiler (tractocamión con caja seca o plataforma)', 'Camión caja seca', 'Camión refrigerado', 'Camión de redilas', 'Camión plataforma', 'Camión cisterna (pipa)', 'Camión de volteo', 'Camión jaula ganadera 🐄', 'Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅', 'Rabón', 'Torton', 'Tractocamión con caja seca, plataforma o jaula', 'otro']),
  otherType: z.string().optional(),
  brand: z.string().min(2, 'La marca es obligatoria.'),
  model: z.string().min(1, 'El modelo es obligatorio.'),
  licensePlate: z.string().min(5, 'La placa es obligatoria.'),
  year: z.coerce.number().min(1980, 'Año inválido').max(new Date().getFullYear() + 1, 'Año inválido'),
  loadCapacity: z.coerce.number().positive('Debe ser un número positivo.').optional(),
  hasGps: z.enum(['yes', 'no'], { required_error: 'Debes seleccionar una opción.'}),
  gpsLink: z.string().url('Por favor, introduce una URL válida.').optional().or(z.literal('')),
}).superRefine((data, ctx) => {
    if (data.type === 'otro' && (!data.otherType || data.otherType.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, especifica el otro tipo de camión.',
            path: ['otherType'],
        });
    }
    if (data.hasGps === 'yes' && (!data.gpsLink || data.gpsLink.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'El enlace GPS es obligatorio si seleccionas "Sí".',
            path: ['gpsLink'],
        });
    }
});


type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

const trailerFormSchema = z.object({
  type: z.enum(['Caja Seca', 'Refrigerada', 'Plataforma', 'Jaula', 'Otro']),
  otherType: z.string().optional(),
  length: z.enum(['48 ft', '53 ft', 'Otro']),
  licensePlate: z.string().min(5, 'La placa es obligatoria.'),
  economicNumber: z.string().optional(),
  specialConditions: z.string().optional(),
}).superRefine((data, ctx) => {
    if (data.type === 'Otro' && (!data.otherType || data.otherType.trim() === '')) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Por favor, especifica el otro tipo de aditamento.',
            path: ['otherType'],
        });
    }
});


type TrailerFormValues = z.infer<typeof trailerFormSchema>;

function VehicleForm({ onFormSubmit, userId, existingVehicle }: { onFormSubmit: (data: Vehicle) => void, userId: string, existingVehicle?: Vehicle }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // File states
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [circulationCardFile, setCirculationCardFile] = useState<File | null>(null);
    const [insurancePolicyFile, setInsurancePolicyFile] = useState<File | null>(null);
    const [vehicleInspectionFile, setVehicleInspectionFile] = useState<File | null>(null);
    const [sctPermitFile, setSctPermitFile] = useState<File | null>(null);
    const [maintenanceLogFile, setMaintenanceLogFile] = useState<File | null>(null);

    
    const form = useForm<VehicleFormValues>({
        resolver: zodResolver(vehicleFormSchema),
        defaultValues: existingVehicle ? { ...existingVehicle, type: existingVehicle.type || 'Tráiler (tractocamión con caja seca o plataforma)', hasGps: existingVehicle.hasGps ? 'yes' : 'no' } : { type: 'Tráiler (tractocamión con caja seca o plataforma)', otherType: '', brand: '', model: '', licensePlate: '', loadCapacity: '' as any, hasGps: 'no', year: new Date().getFullYear(), gpsLink: '' },
    });
    
     useEffect(() => {
        if(existingVehicle) {
            form.reset({ ...existingVehicle, type: existingVehicle.type || 'Tráiler (tractocamión con caja seca o plataforma)', hasGps: existingVehicle.hasGps ? 'yes' : 'no', gpsLink: existingVehicle.gpsLink || '' });
        }
    }, [existingVehicle, form]);

     const resetFormState = () => {
        form.reset();
        setPhotoFile(null);
        setCirculationCardFile(null);
        setInsurancePolicyFile(null);
        setVehicleInspectionFile(null);
        setSctPermitFile(null);
        setMaintenanceLogFile(null);
        setOpen(false);
        setIsSubmitting(false);
    };


    const onSubmit = async (data: VehicleFormValues) => {
        setIsSubmitting(true);
        const vehicleId = existingVehicle?.id || generateId();
        
        try {
             const upload = async (file: File | null, type: string): Promise<{ url: string; name: string } | undefined> => {
                if (!file) return undefined;
                const dataUrl = await fileToDataUrl(file);
                const filePath = `vehicles/${userId}/${vehicleId}/${type}_${file.name}`;
                const url = await uploadFileToServer(filePath, dataUrl);
                return { url, name: file.name };
            };

            const [
                photo,
                circulationCard,
                insurancePolicy,
                vehicleInspection,
                sctPermit,
                maintenanceLog,
            ] = await Promise.all([
                upload(photoFile, 'photo'),
                upload(circulationCardFile, 'circulation_card'),
                upload(insurancePolicyFile, 'insurance_policy'),
                upload(vehicleInspectionFile, 'vehicle_inspection'),
                upload(sctPermitFile, 'sct_permit'),
                upload(maintenanceLogFile, 'maintenance_log'),
            ]);

            const newVehicle: Vehicle = { 
                id: vehicleId, 
                ...data,
                hasGps: data.hasGps === 'yes',
                gpsLink: data.hasGps === 'yes' ? data.gpsLink : undefined,
                photoUrl: photo?.url || existingVehicle?.photoUrl,
                circulationCardUrl: circulationCard?.url || existingVehicle?.circulationCardUrl,
                circulationCardName: circulationCard?.name || existingVehicle?.circulationCardName,
                insurancePolicyUrl: insurancePolicy?.url || existingVehicle?.insurancePolicyUrl,
                insurancePolicyName: insurancePolicy?.name || existingVehicle?.insurancePolicyName,
                vehicleInspectionUrl: vehicleInspection?.url || existingVehicle?.vehicleInspectionUrl,
                vehicleInspectionName: vehicleInspection?.name || existingVehicle?.vehicleInspectionName,
                sctPermitUrl: sctPermit?.url || existingVehicle?.sctPermitUrl,
                sctPermitName: sctPermit?.name || existingVehicle?.sctPermitName,
                maintenanceLogUrl: maintenanceLog?.url || existingVehicle?.maintenanceLogUrl,
                maintenanceLogName: maintenanceLog?.name || existingVehicle?.maintenanceLogName,
            };
            onFormSubmit(newVehicle);
            toast({ title: existingVehicle ? "Unidad actualizada" : "Unidad añadida", description: "La información de la unidad ha sido guardada." });
            resetFormState();
        } catch (error) {
            console.error("Error adding vehicle:", error);
            toast({ title: "Error", description: "No se pudo añadir la unidad.", variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    const trigger = existingVehicle ? (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /></Button>
    ) : (
        <Button onClick={() => setOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Unidad</Button>
    );


    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{existingVehicle ? 'Editar Unidad' : 'Añadir Nueva Unidad (Camión)'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                             <div className="space-y-4">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Tipo de Camión</FormLabel>
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
                                <OtherVehicleTypeField control={form.control} />
                                <FormField control={form.control} name="brand" render={({ field }) => (
                                    <FormItem><FormLabel>Marca</FormLabel><FormControl><Input {...field} placeholder="Ej: Freightliner" /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="model" render={({ field }) => (
                                    <FormItem><FormLabel>Modelo</FormLabel><FormControl><Input {...field} placeholder="Ej: Cascadia" /></FormControl><FormMessage /></FormItem>
                                )}/>
                                 <FormField control={form.control} name="year" render={({ field }) => (
                                    <FormItem><FormLabel>Año</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                                    <FormItem><FormLabel>Placas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="loadCapacity" render={({ field }) => (
                                    <FormItem><FormLabel>Capacidad de Carga (kg)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                            <div className="flex flex-col gap-4">
                                <PhotoUpload file={photoFile} onFileSelect={setPhotoFile} existingUrl={existingVehicle?.photoUrl} label="Foto de la Unidad" isVehicle={true} />
                                <FormField control={form.control} name="hasGps" render={({ field }) => (
                                <FormItem className="col-span-1 md:col-span-2 text-center"><FormLabel>¿Cuenta con GPS?</FormLabel>
                                    <FormControl>
                                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-4 pt-2 justify-center">
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="yes" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                        <FormItem className="flex items-center space-x-2"><FormControl><RadioGroupItem value="no" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                                    </RadioGroup>
                                    </FormControl>
                                </FormItem>
                                )}/>
                                 <GpsLinkField control={form.control} />
                            </div>
                        </div>

                         <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-primary">Documentos de la Unidad</h4>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                               <DocumentUpload label="Tarjeta de Circulación Vigente" file={circulationCardFile} onFileSelect={setCirculationCardFile} onFileRemove={() => setCirculationCardFile(null)} existingUrl={existingVehicle?.circulationCardUrl} existingFileName={existingVehicle?.circulationCardName} />
                               <DocumentUpload label="Póliza de Seguro Vigente" file={insurancePolicyFile} onFileSelect={setInsurancePolicyFile} onFileRemove={() => setInsurancePolicyFile(null)} existingUrl={existingVehicle?.insurancePolicyUrl} existingFileName={existingVehicle?.insurancePolicyName} />
                               <DocumentUpload label="Verificación Vehicular / Físico-Mecánica" file={vehicleInspectionFile} onFileSelect={setVehicleInspectionFile} onFileRemove={() => setVehicleInspectionFile(null)} existingUrl={existingVehicle?.vehicleInspectionUrl} existingFileName={existingVehicle?.vehicleInspectionName} />
                               <DocumentUpload label="Permiso SCT" file={sctPermitFile} onFileSelect={setSctPermitFile} onFileRemove={() => setSctPermitFile(null)} existingUrl={existingVehicle?.sctPermitUrl} existingFileName={existingVehicle?.sctPermitName} />
                               <DocumentUpload label="Bitácora de Mantenimiento" file={maintenanceLogFile} onFileSelect={setMaintenanceLogFile} onFileRemove={() => setMaintenanceLogFile(null)} existingUrl={existingVehicle?.maintenanceLogUrl} existingFileName={existingVehicle?.maintenanceLogName} />
                            </div>
                        </div>

                        <DialogFooter className="pt-6">
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {existingVehicle ? 'Actualizar Unidad' : 'Guardar Unidad'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function TrailerForm({ onFormSubmit, userId, existingTrailer }: { onFormSubmit: (data: Trailer) => void, userId: string, existingTrailer?: Trailer }) {
    const [open, setOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    // File states
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [circulationCardFile, setCirculationCardFile] = useState<File | null>(null);
    const [insurancePolicyFile, setInsurancePolicyFile] = useState<File | null>(null);
    const [mechanicalInspectionFile, setMechanicalInspectionFile] = useState<File | null>(null);
    const [sctPermitFile, setSctPermitFile] = useState<File | null>(null);


    const form = useForm<TrailerFormValues>({
        resolver: zodResolver(trailerFormSchema),
        defaultValues: existingTrailer || { type: 'Caja Seca', otherType: '', length: '53 ft', licensePlate: '', economicNumber: '', specialConditions: '' },
    });
    
     useEffect(() => {
        if(existingTrailer) {
            form.reset(existingTrailer);
        }
    }, [existingTrailer, form]);

     const resetFormState = () => {
        form.reset();
        setPhotoFile(null);
        setCirculationCardFile(null);
        setInsurancePolicyFile(null);
        setMechanicalInspectionFile(null);
        setSctPermitFile(null);
        setOpen(false);
        setIsSubmitting(false);
    };

    const onSubmit = async (data: TrailerFormValues) => {
        setIsSubmitting(true);
        const trailerId = existingTrailer?.id || generateId();
        
        try {
            const upload = async (file: File | null, type: string): Promise<{ url: string; name: string } | undefined> => {
                if (!file) return undefined;
                const dataUrl = await fileToDataUrl(file);
                const filePath = `trailers/${userId}/${trailerId}/${type}_${file.name}`;
                const url = await uploadFileToServer(filePath, dataUrl);
                return { url, name: file.name };
            };

            const [
                photo,
                circulationCard,
                insurancePolicy,
                mechanicalInspection,
                sctPermit,
            ] = await Promise.all([
                upload(photoFile, 'photo'),
                upload(circulationCardFile, 'circulation_card'),
                upload(insurancePolicyFile, 'insurance_policy'),
                upload(mechanicalInspectionFile, 'mechanical_inspection'),
                upload(sctPermitFile, 'sct_permit'),
            ]);


            const newTrailer: Trailer = { 
                id: trailerId, 
                ...data,
                photoUrl: photo?.url || existingTrailer?.photoUrl,
                circulationCardUrl: circulationCard?.url || existingTrailer?.circulationCardUrl,
                circulationCardName: circulationCard?.name || existingTrailer?.circulationCardName,
                insurancePolicyUrl: insurancePolicy?.url || existingTrailer?.insurancePolicyUrl,
                insurancePolicyName: insurancePolicy?.name || existingTrailer?.insurancePolicyName,
                mechanicalInspectionUrl: mechanicalInspection?.url || existingTrailer?.mechanicalInspectionUrl,
                mechanicalInspectionName: mechanicalInspection?.name || existingTrailer?.mechanicalInspectionName,
                sctPermitUrl: sctPermit?.url || existingTrailer?.sctPermitUrl,
                sctPermitName: sctPermit?.name || existingTrailer?.sctPermitName,
            };
            onFormSubmit(newTrailer);
            toast({ title: existingTrailer ? "Aditamento actualizado" : "Aditamento añadido", description: "El aditamento ha sido guardado." });
            resetFormState();

        } catch(error) {
            console.error("Error adding trailer:", error);
            toast({ title: "Error", description: "No se pudo añadir el aditamento.", variant: "destructive" });
            setIsSubmitting(false);
        }
    };
    
    const trigger = existingTrailer ? (
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(true)}><Edit className="h-4 w-4" /></Button>
    ) : (
        <Button onClick={() => setOpen(true)}><PlusCircle className="mr-2 h-4 w-4" /> Añadir Aditamento</Button>
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                 {trigger}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{existingTrailer ? 'Editar Aditamento' : 'Añadir Nuevo Aditamento'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-1">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                            <div className="space-y-4">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Tipo de Caja / Aditamento</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="Caja Seca">Caja Seca</SelectItem>
                                            <SelectItem value="Refrigerada">Refrigerada</SelectItem>
                                            <SelectItem value="Plataforma">Plataforma</SelectItem>
                                            <SelectItem value="Jaula">Jaula</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <OtherTrailerTypeField control={form.control} />
                                <FormField control={form.control} name="length" render={({ field }) => (
                                    <FormItem><FormLabel>Largo</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="48 ft">48 ft</SelectItem>
                                            <SelectItem value="53 ft">53 ft</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select><FormMessage />
                                    </FormItem>
                                )}/>
                                <FormField control={form.control} name="licensePlate" render={({ field }) => (
                                    <FormItem><FormLabel>Placas</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                                <FormField control={form.control} name="economicNumber" render={({ field }) => (
                                    <FormItem><FormLabel>Número Económico (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                                )}/>
                            </div>
                             <div className="flex flex-col gap-4">
                                <PhotoUpload file={photoFile} onFileSelect={setPhotoFile} existingUrl={existingTrailer?.photoUrl} label="Foto del Aditamento" isTrailer={true} />
                            </div>
                        </div>

                        <FormField control={form.control} name="specialConditions" render={({ field }) => (
                            <FormItem><FormLabel>Condiciones Especiales (Opcional)</FormLabel>
                                <FormControl><Textarea {...field} placeholder="Ej: Riel logístico, suspensión de aire, requiere refrigeración a -15°C" /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )}/>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-semibold text-primary">Documentos del Aditamento</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <DocumentUpload label="Tarjeta de Circulación" file={circulationCardFile} onFileSelect={setCirculationCardFile} onFileRemove={() => setCirculationCardFile(null)} existingUrl={existingTrailer?.circulationCardUrl} existingFileName={existingTrailer?.circulationCardName} />
                                <DocumentUpload label="Póliza de Seguro" file={insurancePolicyFile} onFileSelect={setInsurancePolicyFile} onFileRemove={() => setInsurancePolicyFile(null)} existingUrl={existingTrailer?.insurancePolicyUrl} existingFileName={existingTrailer?.insurancePolicyName} />
                                <DocumentUpload label="Dictamen de Inspección Físico-Mecánica" file={mechanicalInspectionFile} onFileSelect={setMechanicalInspectionFile} onFileRemove={() => setMechanicalInspectionFile(null)} existingUrl={existingTrailer?.mechanicalInspectionUrl} existingFileName={existingTrailer?.mechanicalInspectionName} />
                                <DocumentUpload label="Permiso SCT (si aplica)" file={sctPermitFile} onFileSelect={setSctPermitFile} onFileRemove={() => setSctPermitFile(null)} existingUrl={existingTrailer?.sctPermitUrl} existingFileName={existingTrailer?.sctPermitName} />
                            </div>
                        </div>

                        <DialogFooter className="pt-6">
                            <DialogClose asChild><Button type="button" variant="secondary" disabled={isSubmitting}>Cancelar</Button></DialogClose>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                {existingTrailer ? 'Actualizar Aditamento' : 'Guardar Aditamento'}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}



function FleetManagementPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { updateUserProfile } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [carrierData, setCarrierData] = useState<CarrierProfileData | null>(null);
  
  const activeTab = searchParams.get('tab') || 'drivers';

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setCarrierData(doc.data() as CarrierProfileData);
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else if (!authLoading) {
      setIsLoading(false);
      router.push('/auth');
    }
  }, [user, authLoading, router]);


  const handleUpdateSection = useCallback(async (section: 'drivers' | 'vehicles' | 'trailers', data: any[]) => {
    if (!user) {
        toast({ title: "No autenticado", description: "Debes iniciar sesión.", variant: "destructive" });
        return;
    }
    try {
        await updateUserProfile(user.uid, { [section]: data });
        // toast is handled inside the form components
    } catch (error) {
        console.error(`Error updating ${section}:`, error);
        toast({ title: "Error", description: `No se pudo actualizar la sección ${section}.`, variant: "destructive" });
    }
  }, [user, toast, updateUserProfile]);

  const handleSaveItem = useCallback(async (section: 'drivers' | 'vehicles' | 'trailers', itemToSave: any) => {
    if (!user || !carrierData) return;
    const currentItems = (carrierData[section] as any[] || []);
    const itemIndex = currentItems.findIndex(item => item.id === itemToSave.id);
    
    let updatedItems;
    if (itemIndex > -1) {
        // Update existing item
        updatedItems = [...currentItems];
        updatedItems[itemIndex] = itemToSave;
    } else {
        // Add new item
        updatedItems = [...currentItems, itemToSave];
    }
    await handleUpdateSection(section, updatedItems);
  }, [user, carrierData, handleUpdateSection]);

  const handleRemoveItem = useCallback(async (section: 'drivers' | 'vehicles' | 'trailers', idToRemove: string) => {
    if (!user || !carrierData) return;
    if (!confirm('¿Estás seguro de que quieres eliminar este elemento?')) return;
    const currentItems = carrierData[section] as any[] || [];
    const updatedItems = currentItems.filter(item => item.id !== idToRemove);
    await handleUpdateSection(section, updatedItems);
    toast({ title: "Elemento eliminado", description: `El elemento ha sido eliminado de tu flota.` });
  }, [user, carrierData, handleUpdateSection, toast]);

  if (isLoading || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6 max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0"><ArrowLeft className="h-6 w-6" /></Button>
            <h1 className="text-xl md:text-2xl font-bold text-primary truncate">Gestionar Flota y Operadores</h1>
        </div>
        
        <Alert className="mb-6">
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Completa la información de tu flota</AlertTitle>
            <AlertDescription className="text-sm">
            Mantener esta información actualizada permitirá a las empresas conocer tu capacidad y equipo disponible.
            </AlertDescription>
        </Alert>
        
        <Tabs defaultValue={activeTab} className="w-full" onValueChange={(value) => {
            const params = new URLSearchParams(searchParams);
            params.set('tab', value);
            router.replace(`?${params.toString()}`);
        }}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="drivers" className="text-xs md:text-sm">Conductores</TabsTrigger>
            <TabsTrigger value="vehicles" className="text-xs md:text-sm">Unidades</TabsTrigger>
            <TabsTrigger value="trailers" className="text-xs md:text-sm">Remolques</TabsTrigger>
          </TabsList>

          <TabsContent value="vehicles" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Unidades (Camiones)</CardTitle>
                    <CardDescription>Lista de tus camiones o unidades tractoras.</CardDescription>
                  </div>
                  {user && <VehicleForm
                    onFormSubmit={(newVehicle) => handleSaveItem('vehicles', newVehicle)}
                    userId={user.uid}
                  />}
                </CardHeader>
                <CardContent className="space-y-4 px-2 md:px-6">
                  <div className="border-t pt-2">
                    {carrierData?.vehicles?.length ? (
                      carrierData.vehicles.map((vehicle) => (
                        <div key={vehicle.id} className="p-3 md:p-4 border rounded-lg mt-3 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                            <Avatar className="h-16 w-16 border shrink-0">
                                <AvatarImage src={vehicle.photoUrl} className="object-cover" />
                                <AvatarFallback><Truck className="text-muted-foreground" /></AvatarFallback>
                            </Avatar>
                            <div className="flex-grow w-full text-center sm:text-left">
                                <div className="flex items-start justify-between">
                                    <div className="font-semibold text-lg sm:text-base">{vehicle.brand} {vehicle.model} ({vehicle.year})</div>
                                    <div className="flex items-center gap-2">
                                    {user && <VehicleForm
                                        onFormSubmit={(updatedVehicle) => handleSaveItem('vehicles', updatedVehicle)}
                                        userId={user.uid}
                                        existingVehicle={vehicle}
                                    />}
                                    <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem('vehicles', vehicle.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 mt-2">
                                    <p><strong>Placa:</strong> {vehicle.licensePlate}</p>
                                    <p><strong>Tipo:</strong> {vehicle.type === 'otro' ? vehicle.otherType : vehicle.type}</p>
                                    <p><strong>Capacidad:</strong> {vehicle.loadCapacity ? `${vehicle.loadCapacity} kg` : 'N/A'}</p>
                                    <div className="flex items-center justify-center sm:justify-start gap-2 font-medium">
                                    <MapPin className="h-4 w-4" /> {vehicle.hasGps ? 'Con GPS' : 'Sin GPS'}
                                    </div>
                                </div>
                            </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No has añadido ninguna unidad todavía.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="trailers" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Cajas / Aditamentos</CardTitle>
                    <CardDescription>Lista de tus cajas, plataformas o aditamentos.</CardDescription>
                  </div>
                  {user && <TrailerForm
                    onFormSubmit={(newTrailer) => handleSaveItem('trailers', newTrailer)}
                    userId={user.uid}
                  />}
                </CardHeader>
                <CardContent className="space-y-4 px-2 md:px-6">
                  <div className="border-t pt-2">
                    {carrierData?.trailers?.length ? (
                      carrierData.trailers.map((trailer) => (
                        <div key={trailer.id} className="p-3 md:p-4 border rounded-lg mt-3 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                           <Avatar className="h-16 w-16 border shrink-0">
                                <AvatarImage src={trailer.photoUrl} className="object-cover" />
                                <AvatarFallback><Package className="text-muted-foreground" /></AvatarFallback>
                            </Avatar>
                            <div className="flex-grow w-full text-center sm:text-left">
                                 <div className="flex items-start justify-between">
                                    <div className="font-semibold text-lg sm:text-base">{trailer.type === 'Otro' ? trailer.otherType : trailer.type} {trailer.length}</div>
                                    <div className="flex items-center gap-2">
                                    {user && <TrailerForm
                                        onFormSubmit={(updatedTrailer) => handleSaveItem('trailers', updatedTrailer)}
                                        userId={user.uid}
                                        existingTrailer={trailer}
                                    />}
                                    <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem('trailers', trailer.id)}><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-2">
                                    <p><strong>Placa:</strong> {trailer.licensePlate}</p>
                                    <p><strong># Económico:</strong> {trailer.economicNumber || 'N/A'}</p>
                                    <p><strong>Condiciones:</strong> {trailer.specialConditions || 'Ninguna'}</p>
                                </div>
                            </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No has añadido ningún aditamento todavía.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="drivers" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle>Conductores / Operadores</CardTitle>
                    <CardDescription>Esta es la lista de los conductores en tu flota.</CardDescription>
                  </div>
                  {user && <DriverForm
                    onFormSubmit={(newDriver) => handleSaveItem('drivers', newDriver)}
                    userId={user.uid}
                  />}
                </CardHeader>
                <CardContent className="space-y-4 px-2 md:px-6">
                  <div className="border-t pt-2">
                    {carrierData?.drivers?.length ? (
                      carrierData.drivers.map((driver) => (
                        <div key={driver.id} className="p-3 md:p-4 border rounded-lg mt-3 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                          <Avatar className="h-16 w-16 border shrink-0">
                            <AvatarImage src={driver.photoURL} alt={driver.name} className="object-cover" />
                            <AvatarFallback>{driver.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-grow w-full text-center sm:text-left">
                            <div className="flex items-start justify-between">
                              <div className="font-semibold text-lg sm:text-base">{driver.name}</div>
                              <div className="flex items-center gap-2">
                                {user && <DriverForm
                                  onFormSubmit={(updatedDriver) => handleSaveItem('drivers', updatedDriver)}
                                  userId={user.uid}
                                  existingDriver={driver}
                                />}
                                <Button type="button" variant="destructive" size="icon" className="h-7 w-7" onClick={() => handleRemoveItem('drivers', driver.id)}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 mt-2">
                              <p><strong>Tel:</strong> {driver.phone || 'N/A'}</p>
                              <p><strong>RFC:</strong> {driver.rfc || 'N/A'}</p>
                              <p><strong># Operador:</strong> {driver.operatorNumber || 'N/A'}</p>
                              <p><strong>CURP:</strong> {driver.curp || 'N/A'}</p>
                              <p><strong>Licencia:</strong> {driver.license?.licenseType ? `Tipo ${driver.license.licenseType}` : 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No has añadido ningún conductor todavía.</p>
                    )}
                  </div>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
}

export default function FleetManagementPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <FleetManagementPageContent />
        </Suspense>
    );
}
