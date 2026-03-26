

'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building, Mail, Phone, MapPin, LogOut, Edit, Loader2, FileText } from 'lucide-react';
import Link from "next/link";
import { useTrips } from "@/context/trips-context";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "next/navigation";
import { uploadFileToServer } from "@/lib/server-actions";

type UserData = {
  companyName: string;
  email: string;
  phone: string;
  address: string;
  rfc: string;
  role: 'transportista' | 'empresa';
  photoURL?: string;
  taxSituationUrl?: string;
};

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


export function CompanyProfile() {
    const { updateUserProfile } = useTrips();
    const [user, authLoading] = useAuthState(auth);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [userLoading, setUserLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const role = searchParams.get('role');

    useEffect(() => {
        if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
            setUserData(doc.data() as UserData);
            }
            setUserLoading(false);
        });
        return () => unsubscribe();
        } else if (!authLoading) {
        setUserLoading(false);
        }
    }, [user, authLoading]);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!event.target.files || event.target.files.length === 0) return;
        if (!user) return;

        const file = event.target.files[0];
        setIsUploading(true);

        try {
            const dataUrl = await fileToDataUrl(file);
            const filePath = `profile_pictures/${user.uid}/${Date.now()}_${file.name}`;
            const downloadUrl = await uploadFileToServer(filePath, dataUrl);

            await updateUserProfile(user.uid, { photoURL: downloadUrl });
            toast({ title: "Foto de perfil actualizada", description: "Tu nueva foto de perfil ha sido guardada." });
        } catch (error) {
            console.error(error);
            toast({ title: "Error al subir", description: "No se pudo actualizar tu foto de perfil.", variant: "destructive" });
        } finally {
            setIsUploading(false);
        }
    };
    
    const isLoading = authLoading || userLoading;

    if (isLoading) {
        return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>
    }

    if (!user || !userData) {
        return (
            <div className="container mx-auto p-4 md:p-6 text-center">
                <p>No se pudieron cargar los datos del perfil.</p>
                <Button asChild className="mt-4"><Link href="/auth">Iniciar Sesión</Link></Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="flex flex-col md:flex-row items-center gap-6 mb-8">
                <div className="relative group">
                    <Avatar className="h-24 w-24 border-4 border-primary">
                        <AvatarImage src={userData.photoURL} alt={userData.companyName} />
                        <AvatarFallback className="text-3xl bg-secondary">{userData.companyName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                     <Button 
                        size="icon" 
                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 group-hover:bg-primary/80"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        >
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit className="h-4 w-4" />}
                    </Button>
                </div>
                <div className="flex-1 text-center md:text-left">
                    <h1 className="text-3xl font-bold">{userData.companyName}</h1>
                     <p className="text-muted-foreground">Tu socio de confianza en logística.</p>
                </div>
                <div className="flex gap-2">
                     <Button asChild>
                        <Link href={`/profile/edit-company?role=${role || 'empresa'}`}>
                            <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
                <Card>
                    <CardHeader>
                        <CardTitle>Información de la Empresa</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-start gap-4">
                            <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-semibold">Nombre de la Empresa</p>
                                <p>{userData.companyName}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-semibold">Correo Electrónico</p>
                                <p>{userData.email}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-semibold">Teléfono</p>
                                <p>{userData.phone}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-semibold">Dirección</p>
                                <p>{userData.address}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle>Información Fiscal</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                         <div className="flex items-start gap-4">
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-semibold">RFC</p>
                                <p>{userData.rfc}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div>
                                <p className="font-semibold">Constancia de Situación Fiscal</p>
                                {userData.taxSituationUrl ? (
                                    <Button variant="link" asChild className="p-0 h-auto">
                                        <a href={userData.taxSituationUrl} target="_blank" rel="noopener noreferrer">
                                            Ver Documento
                                        </a>
                                    </Button>
                                ) : (
                                    <p className="text-muted-foreground">No disponible</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
