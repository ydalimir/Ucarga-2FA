'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useTrips } from '@/context/trips-context';
import { auth, db } from '@/lib/firebase';
import type { Trip } from '@/lib/types';
import { Loader2, MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { doc, getDoc } from 'firebase/firestore';

async function getCompanyName(userId: string): Promise<{ name: string, image?: string }> {
    if (!userId) return { name: "Empresa" };
    
    const userDocRef = doc(db, 'users', userId);
    try {
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            const userData = userDoc.data();
            return {
                name: userData.companyName || "Empresa",
                image: userData.photoURL
            };
        }
    } catch (error) {
        console.error("Error fetching company name:", error);
    }
    return { name: "Empresa" };
}


const ChatListItem = ({ trip }: { trip: Trip }) => {
    const { getUnreadMessagesCountForCarrier } = useTrips();
    const [unreadCount, setUnreadCount] = useState(0);
    const [user] = useAuthState(auth);
    const [companyInfo, setCompanyInfo] = useState<{ name: string, image?: string }>({ name: 'Cargando...' });

    useEffect(() => {
        if (trip.creatorId) {
            getCompanyName(trip.creatorId).then(setCompanyInfo);
        }
    }, [trip.creatorId]);

    useEffect(() => {
        if (trip.id && trip.creatorId && user) {
            const unsubscribe = getUnreadMessagesCountForCarrier(trip.id, trip.creatorId, setUnreadCount);
            return () => unsubscribe();
        }
    }, [trip.id, trip.creatorId, getUnreadMessagesCountForCarrier, user]);

    const chatUrl = `/chat/${trip.id}/${trip.creatorId}`;

    return (
        <Link href={chatUrl}>
            <Card className="hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={companyInfo.image} />
                        <AvatarFallback>{companyInfo.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                            <p className="font-bold">{companyInfo.name}</p>
                             {unreadCount > 0 && (
                                <Badge variant="destructive" className="h-6">{unreadCount}</Badge>
                            )}
                        </div>
                        <p className="text-sm text-muted-foreground">{trip.shipmentId}</p>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}

function ChatsPageContent() {
    const router = useRouter();
    const { getAssignedTripsForCarrier, loading: tripsLoading } = useTrips();
    const [user, authLoading] = useAuthState(auth);
    const [assignedTrips, setAssignedTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            router.push('/auth');
            return;
        }

        const unsubscribe = getAssignedTripsForCarrier(user.uid, (trips) => {
            setAssignedTrips(trips);
            setLoading(false);
        });

        return () => unsubscribe();

    }, [user, authLoading, getAssignedTripsForCarrier, router]);

    const isLoading = tripsLoading || loading;

    return (
        <div className="container mx-auto p-4 md:p-6">
             <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="md:hidden">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <h1 className="text-2xl font-bold text-primary">Chats</h1>
            </div>
            
            {isLoading ? (
                <div className="flex items-center justify-center pt-16">
                    <Loader2 className="h-8 w-8 animate-spin" />
                </div>
            ) : assignedTrips.length === 0 ? (
                <div className="text-center text-muted-foreground border rounded-lg p-12">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No hay chats todavía</h3>
                    <p className="mt-1 text-sm text-gray-500">Cuando se te asigne un viaje, tu chat con la empresa aparecerá aquí.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {assignedTrips.map(trip => (
                       <ChatListItem key={trip.id} trip={trip} />
                    ))}
                </div>
            )}
        </div>
    );
}


export default function ChatsPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <ChatsPageContent />
        </Suspense>
    );
}