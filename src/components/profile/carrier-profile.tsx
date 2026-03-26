

'use client';

import Image from "next/image";
import Link from "next/link";
import { useTrips } from "@/context/trips-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Truck, LogOut, Star, CheckCircle, Edit, Loader2, Wrench, FileText } from "lucide-react";
import { TripCard } from "@/components/trips/trip-card";
import { useUserRole } from "@/hooks/use-user-role";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth, db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState, useRef, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import type { CarrierProfileData, Trip } from '@/lib/types';
import { uploadFileToServer } from "@/lib/server-actions";


const ITEMS_PER_PAGE = 10;

const fileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};


const PaginatedCompletedTrips = ({ trips }: { trips: Trip[] }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = Math.ceil(trips.length / ITEMS_PER_PAGE);

    const paginatedTrips = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return trips.slice(startIndex, endIndex);
    }, [trips, currentPage]);

    if (trips.length === 0) {
         return (
            <Card>
                <CardContent className="p-6 text-center text-muted-foreground">
                    <p>No has completado ningún viaje todavía.</p>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <div className="space-y-4">
            <div className="space-y-4">
                {paginatedTrips.map(trip => (
                    <TripCard key={trip.id} trip={trip} role="transportista" />
                ))}
            </div>
            {totalPages > 1 && (
                <div className="mt-6 flex justify-between items-center">
                    <Button 
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                    >
                        Anterior
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Página {currentPage} de {totalPages}
                    </span>
                    <Button 
                        variant="outline"
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                    >
                        Siguiente
                    </Button>
                </div>
            )}
        </div>
    );
};


export function CarrierProfile() {
  const { trips, updateUserProfile } = useTrips();
  const [user, authLoading] = useAuthState(auth);
  const [userData, setUserData] = useState<CarrierProfileData | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const userDocRef = doc(db, 'users', user.uid);
      const unsubscribe = onSnapshot(userDocRef, (doc) => {
        if (doc.exists()) {
          setUserData(doc.data() as CarrierProfileData);
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


  const completedTrips = trips.filter(trip => trip.assignedCarrierId === user?.uid && trip.status === 'Completado');

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
      <div className="flex flex-col items-center gap-4 mb-8">
        <div className="relative group">
            <Avatar className="h-24 w-24 border-4 border-primary">
              <AvatarImage src={userData.photoURL} alt={userData.fullName} />
              <AvatarFallback className="text-3xl bg-secondary">{userData.fullName?.charAt(0)}</AvatarFallback>
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
        <h1 className="text-2xl font-bold">{userData.fullName}</h1>
         <div className="flex gap-2">
            <Button asChild>
                <Link href="/profile/edit-carrier?role=transportista">
                    <Edit className="mr-2 h-4 w-4" /> Editar Perfil
                </Link>
            </Button>
            <Button asChild variant="outline">
                <Link href="/profile/edit?role=transportista">
                    <Wrench className="mr-2 h-4 w-4" /> Gestionar Flota
                </Link>
            </Button>
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
                <p className="text-xs text-muted-foreground">Total de viajes finalizados</p>
            </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
            <Card>
                <CardHeader>
                <CardTitle>Información de Perfil</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                <div className="flex items-center gap-4">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <span>{userData.fullName}</span>
                </div>
                <div className="flex items-center gap-4">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <span>{userData.email}</span>
                </div>
                <div className="flex items-center gap-4">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <span>{userData.rfc || "Sin RFC registrado"}</span>
                </div>
                </CardContent>
            </Card>
        </div>
        <div className="md:col-span-2">
            <h2 className="text-xl font-bold mb-4">Historial de Viajes</h2>
            <PaginatedCompletedTrips trips={completedTrips} />
        </div>
      </div>

    </div>
  );
}
