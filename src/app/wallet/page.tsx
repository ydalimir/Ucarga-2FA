
'use client';

import { Suspense, useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { CarrierProfileData } from '@/lib/types';
import { Loader2, ArrowLeft, Wallet, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTrips } from '@/context/trips-context';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';

const PAYPAL_CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!;

const TOKEN_PACKAGE = {
    tokens: 1,
    price: "370.00",
    currency: "MXN",
    description: "Paquete de 1 token"
};

function WalletPageContent() {
    const router = useRouter();
    const { toast } = useToast();
    const { updateUserProfile } = useTrips();
    const [user, authLoading] = useAuthState(auth);
    const [userData, setUserData] = useState<CarrierProfileData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaypalReady, setIsPaypalReady] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user) {
            setLoading(false);
            router.push('/auth');
            return;
        }

        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                setUserData(doc.data() as CarrierProfileData);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading, router]);

    const handleCreateOrder = async (): Promise<string> => {
        const response = await fetch('/api/paypal/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                amount: TOKEN_PACKAGE.price,
            }),
        });
        const order = await response.json();
        if (!response.ok) {
            throw new Error(order.message || 'Error al crear la orden de PayPal.');
        }
        return order.orderId;
    };
    
    const handleApprove = async (data: { orderID: string }): Promise<void> => {
        try {
            const response = await fetch('/api/paypal/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderId: data.orderID }),
            });
            const captureData = await response.json();

            if (captureData.success) {
                const currentBalance = userData?.tokenBalance || 0;
                const newBalance = currentBalance + TOKEN_PACKAGE.tokens;
                if (user) {
                    await updateUserProfile(user.uid, { tokenBalance: newBalance });
                }
                toast({
                    title: "¡Pago Exitoso!",
                    description: `Se ha añadido ${TOKEN_PACKAGE.tokens} token a tu billetera.`
                });
            } else {
                 throw new Error(captureData.details?.message || 'Error al capturar el pago.');
            }

        } catch (error) {
            console.error("Payment Capture Error:", error);
            toast({
                title: "Error en el Pago",
                description: "No se pudo completar la transacción. Por favor, inténtalo de nuevo.",
                variant: "destructive"
            });
        }
    };
    
    const handleError = (err: any) => {
        console.error("PayPal Checkout Error:", err);
        toast({
            title: "Error de PayPal",
            description: "Ocurrió un error con el proceso de pago. Por favor, intenta de nuevo.",
            variant: "destructive"
        });
    };

    useEffect(() => {
        if(PAYPAL_CLIENT_ID) {
            setIsPaypalReady(true);
        }
    }, [])

    if (loading) {
        return <div className="flex h-screen items-center justify-center"><Loader2 className="h-10 w-10 animate-spin" /></div>;
    }

    return (
        <div className="container mx-auto p-4 md:p-6">
            <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}><ArrowLeft className="h-6 w-6" /></Button>
                <h1 className="text-2xl font-bold text-primary">Mi Billetera</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Wallet className="h-6 w-6 text-primary" />
                                Saldo Actual
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="text-center">
                            <p className="text-5xl font-bold">{userData?.tokenBalance || 0}</p>
                            <p className="text-muted-foreground">Tokens</p>
                        </CardContent>
                        <CardFooter>
                            <p className="text-xs text-muted-foreground">Usa tus tokens para ofertar en nuevos viajes. Cada oferta consume 1 token.</p>
                        </CardFooter>
                    </Card>
                </div>
                 <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Comprar Tokens</CardTitle>
                            <CardDescription>Añade más tokens a tu billetera para seguir ofertando.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                           <div className="p-6 rounded-lg border bg-secondary/50 flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg flex items-center gap-2"><Star className="h-5 w-5 text-yellow-500 fill-yellow-400" /> {TOKEN_PACKAGE.tokens} Token</p>
                                    <p className="text-muted-foreground text-sm">{TOKEN_PACKAGE.description}</p>
                                </div>
                                <p className="text-2xl font-bold">${TOKEN_PACKAGE.price} {TOKEN_PACKAGE.currency}</p>
                           </div>
                        </CardContent>
                         <CardFooter className="flex-col gap-4">
                            {!isPaypalReady ? (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error de Configuración</AlertTitle>
                                    <AlertDescription>
                                        El sistema de pagos no está configurado. Por favor, añade la variable de entorno `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
                                    </AlertDescription>
                                </Alert>
                            ) : (
                                <>
                                <p className="text-sm text-muted-foreground mb-4">Paga de forma segura con PayPal.</p>
                                <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, currency: TOKEN_PACKAGE.currency, intent: "capture" }}>
                                    <PayPalButtons
                                        style={{ layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay' }}
                                        createOrder={handleCreateOrder}
                                        onApprove={handleApprove}
                                        onError={handleError}
                                        className="w-full"
                                    />
                                </PayPalScriptProvider>
                                </>
                            )}
                        </CardFooter>
                    </Card>
                 </div>
            </div>
        </div>
    );
}

export default function WalletPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <WalletPageContent />
        </Suspense>
    )
}
