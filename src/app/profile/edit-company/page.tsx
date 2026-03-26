

'use client';

import { Suspense, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTrips } from '@/context/trips-context';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, onSnapshot } from 'firebase/firestore';
import type { CarrierProfileData } from '@/lib/types';
import { ArrowLeft, Save, Loader2, Mail, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { uploadFileToServer } from '@/lib/server-actions';

const formSchema = z.object({
  companyName: z.string().min(3, 'El nombre de la empresa debe tener al menos 3 caracteres.'),
  rfc: z.string().min(12, 'El RFC debe tener al menos 12 caracteres.'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos.'),
  address: z.string().min(5, 'La dirección es muy corta.'),
  taxSituationUrl: z.string().optional(),
  taxSituationName: z.string().optional(), // To store the file name
});

type FormValues = z.infer<typeof formSchema>;

const removeUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => removeUndefined(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc, key) => {
      const value = removeUndefined(obj[key]);
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {} as any);
  }
  return obj;
};

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

function EditCompanyProfilePageContent() {
  const router = useRouter();
  const { updateUserProfile } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [taxSituationFile, setTaxSituationFile] = useState<File | null>(null);
  const taxSituationInputRef = useRef<HTMLInputElement | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: '',
      rfc: '',
      phone: '',
      address: '',
      taxSituationUrl: '',
      taxSituationName: '',
    },
  });

  useEffect(() => {
    if (user) {
      setUserEmail(user.email || 'No disponible');
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data() as CarrierProfileData;
          form.reset({
            companyName: data.companyName || '',
            rfc: data.rfc || '',
            phone: data.phone || '',
            address: data.address || '',
            taxSituationUrl: data.taxSituationUrl || '',
            taxSituationName: data.taxSituationName || '',
          });
        }
        setIsLoading(false);
      });
      return () => unsubscribe();
    } else if (!authLoading) {
      setIsLoading(false);
      router.push('/auth');
    }
  }, [user, authLoading, form, router]);

  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({ title: "No autenticado", description: "Debes iniciar sesión para actualizar tu perfil.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      let finalData: Partial<FormValues> = { ...data };

      if (taxSituationFile) {
        const dataUrl = await fileToDataUrl(taxSituationFile);
        const filePath = `tax_situation/${user.uid}/${Date.now()}_${taxSituationFile.name}`;
        const docUrl = await uploadFileToServer(filePath, dataUrl);
        finalData.taxSituationUrl = docUrl;
        finalData.taxSituationName = taxSituationFile.name;
      }

      const cleanedData = removeUndefined(finalData);
      await updateUserProfile(user.uid, cleanedData);
      toast({ title: "Perfil actualizado", description: "La información de tu empresa ha sido guardada." });
      router.push('/profile?role=empresa');
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const currentFileName = taxSituationFile?.name || form.getValues('taxSituationName') || 'Constancia.pdf';


  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-primary">Editar Perfil de Empresa</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle>Información de la Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="companyName" render={({ field }) => (
                <FormItem><FormLabel>Nombre de la Empresa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="rfc" render={({ field }) => (
                <FormItem><FormLabel>RFC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Dirección</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              
              <div className="space-y-2">
                <FormLabel>Correo Electrónico</FormLabel>
                <div className="flex items-center gap-2 p-2 rounded-md bg-muted border">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{userEmail} (No se puede editar)</span>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader><CardTitle>Documentos Fiscales</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                <FormLabel>Constancia de Situación Fiscal (PDF)</FormLabel>
                <input type="file" className="hidden" accept="application/pdf" ref={taxSituationInputRef} onChange={(e) => setTaxSituationFile(e.target.files ? e.target.files[0] : null)} />
                <Card className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-4 cursor-pointer hover:bg-muted/50 p-2 rounded-md flex-1" onClick={() => taxSituationInputRef.current?.click()}>
                    <FileText className="h-8 w-8 text-primary" />
                    <div className="text-sm">
                      {taxSituationFile ? (
                        <p className="font-semibold">{taxSituationFile.name}</p>
                      ) : form.getValues('taxSituationUrl') ? (
                        <p className="font-semibold">{form.getValues('taxSituationName') || 'Documento guardado'}</p>
                      ) : (
                        <p className="text-muted-foreground">Haz clic para subir un archivo PDF</p>
                      )}
                    </div>
                  </div>
                  {form.getValues('taxSituationUrl') && (
                     <Button variant="link" asChild>
                      <a href={form.getValues('taxSituationUrl')} target="_blank" rel="noopener noreferrer" download={currentFileName}>
                        Descargar Constancia
                      </a>
                    </Button>
                  )}
                </Card>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-center pt-4">
            <Button type="submit" size="lg" disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando...</> : <><Save className="mr-2 h-4 w-4" /> Guardar Cambios</>}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default function EditCompanyProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <EditCompanyProfilePageContent />
        </Suspense>
    );
}
