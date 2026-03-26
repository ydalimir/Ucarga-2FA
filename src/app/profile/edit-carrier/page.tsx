

'use client';

import { Suspense, useEffect, useState } from 'react';
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

const formSchema = z.object({
  fullName: z.string().min(3, 'El nombre debe tener al menos 3 caracteres.'),
  phone: z.string().min(10, 'El teléfono debe tener al menos 10 dígitos.'),
  rfc: z.string().optional(),
  description: z.string().max(200, 'La descripción no puede tener más de 200 caracteres.').optional(),
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

function EditCarrierProfilePageContent() {
  const router = useRouter();
  const { updateUserProfile } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      rfc: '',
      description: '',
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
            fullName: data.fullName || '',
            phone: data.phone || '',
            rfc: data.rfc || '',
            description: data.description || '',
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
      const finalData = {
          fullName: data.fullName,
          phone: data.phone,
          rfc: data.rfc,
          description: data.description,
      };

      const cleanedData = removeUndefined(finalData);
      await updateUserProfile(user.uid, cleanedData);
      toast({ title: "Perfil actualizado", description: "La información de tu perfil ha sido guardada." });
      router.push('/profile?role=transportista');
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "No se pudo actualizar el perfil.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-6">
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold text-primary">Editar Perfil de Transportista</h1>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 max-w-2xl mx-auto">
          <Card>
            <CardHeader><CardTitle>Información General</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Nombre Completo o Razón Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Descripción Breve</FormLabel><FormControl><Textarea placeholder="Ej: Especialistas en carga refrigerada en el sureste." {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input type="tel" {...field} /></FormControl><FormMessage /></FormItem>
              )}/>
               <FormField control={form.control} name="rfc" render={({ field }) => (
                <FormItem><FormLabel>RFC</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
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

export default function EditCarrierProfilePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>}>
            <EditCarrierProfilePageContent />
        </Suspense>
    );
}
