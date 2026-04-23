'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sailboat } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleError = (error: any) => {
    setIsLoading(false);
    console.error('Auth Error:', error);
    let message = 'Ocurrió un error. Por favor, inténtalo de nuevo.';
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
          message = 'No se encontró un usuario con ese correo electrónico.';
          break;
        case 'auth/invalid-email':
          message = 'El correo electrónico no es válido.';
          break;
        default:
          message = error.message;
      }
    }
    toast({ title: 'Error', description: message, variant: 'destructive' });
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({ title: 'Atención', description: 'Por favor, ingresa tu correo electrónico.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      auth.languageCode = 'es'; // Forzar correo en español
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada o carpeta de spam para restablecer tu contraseña.' });
      router.push('/auth');
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md">
        <form onSubmit={handleResetPassword}>
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-2">
                <Sailboat className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-primary">UCarga</h1>
            </Link>
            <CardTitle className="text-xl mt-4">Recuperar Contraseña</CardTitle>
            <CardDescription>Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="usuario@ejemplo.com" 
                required 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                disabled={isLoading} 
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Enviando...' : 'Enviar correo de recuperación'}
            </Button>
            <Button variant="link" type="button" onClick={() => router.push('/auth')} className="p-0 h-auto" disabled={isLoading}>
              Volver a Iniciar Sesión
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
