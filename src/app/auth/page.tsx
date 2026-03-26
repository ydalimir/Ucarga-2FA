'use client';

import { useState, Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  User,
  getMultiFactorResolver,
  PhoneAuthProvider,
  PhoneMultiFactorGenerator,
  multiFactor,
  RecaptchaVerifier,
  MultiFactorResolver
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Sailboat, Eye, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { Textarea } from '@/components/ui/textarea';

type UserRole = 'empresa' | 'transportista';
type MfaStep = 'auth' | 'verifyLogin' | 'verifyEnroll';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const initialAction = searchParams.get('action');
  const [isLogin, setIsLogin] = useState(initialAction !== 'signup');
  const [role, setRole] = useState<UserRole>('empresa');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Signup fields
  const [companyName, setCompanyName] = useState('');
  const [rfc, setRfc] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [fullName, setFullName] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA States
  const [mfaStep, setMfaStep] = useState<MfaStep>('auth');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [verificationId, setVerificationId] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Limpiar recaptcha al desmontar o cambiar de pantalla
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
    };
  }, []);

  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
    }
    return window.recaptchaVerifier;
  };

  const handleSuccess = (userRole: UserRole) => {
    setIsLoading(false);
    toast({ title: 'Éxito', description: 'Has ingresado correctamente.' });
    router.push(`/dashboard?role=${userRole}`);
  };

  const handleError = (error: any) => {
    setIsLoading(false);
    console.error('Auth Error:', error);
    let message = 'Ocurrió un error. Por favor, inténtalo de nuevo.';
    if (error.code) {
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          message = 'Correo electrónico o contraseña incorrectos.';
          break;
        case 'auth/email-already-in-use':
          message = 'Este correo electrónico ya está registrado.';
          break;
        case 'auth/weak-password':
          message = 'La contraseña debe tener al menos 6 caracteres.';
          break;
        case 'auth/invalid-verification-code':
          message = 'El código SMS ingresado es incorrecto.';
          break;
        case 'auth/account-exists-with-different-credential':
          message = 'Ya existe una cuenta con este correo electrónico. Intenta iniciar sesión con otro método.';
          break;
        case 'auth/too-many-requests':
          message = 'Demasiados intentos. Intenta más tarde.';
          break;
        default:
          message = error.message;
      }
    }
    toast({ title: 'Error de Autenticación', description: message, variant: 'destructive' });
  };
  
  const handleResetPassword = async () => {
    if (!email) {
      toast({ title: 'Atención', description: 'Por favor, ingresa tu correo electrónico arriba y luego presiona este botón para restablecer la contraseña.', variant: 'destructive' });
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Correo enviado', description: 'Revisa tu bandeja de entrada o carpeta de spam para restablecer tu contraseña.' });
    } catch (error: any) {
      handleError(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setIsLoading(false);
        toast({ title: 'Correo no verificado', description: 'Por favor, haz clic en el enlace que te enviamos por correo electrónico para confirmar tu cuenta.', variant: 'destructive' });
        auth.signOut();
        return;
      }

      const enrolledFactors = multiFactor(user).enrolledFactors;
      if (enrolledFactors.length === 0) {
        setCurrentUser(user);
        const recaptcha = setupRecaptcha();
        const session = await multiFactor(user).getSession();
        
        let phoneStr = phone;
        if (!phoneStr) {
           const userDoc = await getDoc(doc(db, 'users', user.uid));
           if (userDoc.exists()) {
             phoneStr = userDoc.data().phone || '';
           }
        }

        if (!phoneStr) {
          toast({ title: 'Error', description: 'No se encontró un número celular válido para el 2FA.', variant: 'destructive' });
          setIsLoading(false);
          return;
        }

        phoneStr = phoneStr.startsWith('+') ? phoneStr : `+52${phoneStr.replace(/\D/g, '')}`;
        const phoneInfoOptions = { phoneNumber: phoneStr, session: session };
        const phoneAuthProvider = new PhoneAuthProvider(auth);
        
        const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptcha);
        setVerificationId(vId);
        setIsLoading(false);
        setMfaStep('verifyEnroll');
        toast({ title: 'Seguridad Activada', description: `Te enviamos un SMS al ${phoneStr} para configurar tu Autenticación de Dos Pasos.` });
        return;
      }

      await fetchUserDataAndRedirect(user.uid);
    } catch (error: any) {
      if (error.code === 'auth/multi-factor-auth-required') {
        try {
          const resolver = getMultiFactorResolver(auth, error);
          setMfaResolver(resolver);
          
          const recaptcha = setupRecaptcha();
          const phoneInfoOptions = {
            multiFactorHint: resolver.hints[0],
            session: resolver.session
          };
          
          const phoneAuthProvider = new PhoneAuthProvider(auth);
          const vId = await phoneAuthProvider.verifyPhoneNumber(phoneInfoOptions, recaptcha);
          
          setVerificationId(vId);
          setIsLoading(false);
          setMfaStep('verifyLogin');
          toast({ title: 'Código SMS enviado', description: 'Por favor, ingresa el código que hemos enviado a tu celular.' });
        } catch (mfaError) {
          handleError(mfaError);
        }
      } else {
        handleError(error);
      }
    }
  };

  const fetchUserDataAndRedirect = async (uid: string) => {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userRole = userData.role as UserRole;
          handleSuccess(userRole);
        } else {
          handleError({ code: 'auth/user-data-not-found', message: 'No se encontraron datos de usuario.' });
        }
    } catch (error) {
        handleError(error);
    }
  };

  const handleVerifyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!mfaResolver) throw new Error("MFA Resolver not found");
      
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      const userCredential = await mfaResolver.resolveSignIn(multiFactorAssertion);
      await fetchUserDataAndRedirect(userCredential.user.uid);
    } catch (error) {
      handleError(error);
    }
  };

  const createUserData = async (user: User, userRole: UserRole) => {
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
        const userData: any = {
          uid: user.uid,
          email: user.email,
          role: userRole,
          createdAt: new Date().toISOString(),
          phone: phone || user.phoneNumber,
          rfc: rfc,
          address: address,
        };

        if (userRole === 'empresa') {
          userData.companyName = companyName || user.displayName;
        } else { // transportista
          userData.fullName = fullName || user.displayName;
        }

        await setDoc(userDocRef, userData);

        if (userRole === 'transportista') {
            await updateDoc(userDocRef, {
                tokenBalance: 3
            });
        }
    }
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // 1. Crear el usuario
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // 2. Guardar datos en Firestore
      await createUserData(user, role);

      // 3. Enviar correo de verificación antes de enrolar en 2FA
      await sendEmailVerification(user);
      
      setIsLoading(false);
      toast({ title: '¡Cuenta creada!', description: 'Revisa tu correo para activar tu cuenta. Luego inicia sesión para configurar el SMS de seguridad.' });
      setIsLogin(true); // Regresamos a la vista de login para que ingresen cuando lo validen

    } catch (error) {
      handleError(error);
    }
  };

  const handleVerifyEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (!currentUser) throw new Error("No hay un usuario en progreso de enrolamiento");
      
      const cred = PhoneAuthProvider.credential(verificationId, verificationCode);
      const multiFactorAssertion = PhoneMultiFactorGenerator.assertion(cred);
      
      await multiFactor(currentUser).enroll(multiFactorAssertion, 'Número de Teléfono Principal');
      handleSuccess(role);
    } catch (error) {
      handleError(error);
    }
  };

  // Renderizar la vista de Verificación MFA (Login o Registro)
  if (mfaStep !== 'auth') {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
        <Card className="w-full max-w-md">
          <form onSubmit={mfaStep === 'verifyLogin' ? handleVerifyLogin : handleVerifyEnroll}>
            <CardHeader className="text-center">
              <CardTitle className="text-xl">Autenticación de Dos Pasos</CardTitle>
              <CardDescription>
                Se ha enviado un código SMS de verificación a tu dispositivo registrado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="verificationCode">Código SMS de 6 dígitos</Label>
                <Input 
                  id="verificationCode" 
                  type="text" 
                  placeholder="123456" 
                  required 
                  value={verificationCode} 
                  onChange={e => setVerificationCode(e.target.value)} 
                  disabled={isLoading} 
                  maxLength={6}
                />
              </div>
            </CardContent>
            <CardFooter className="flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Verificando...' : 'Verificar e Ingresar'}
              </Button>
              <Button 
                variant="ghost" 
                type="button" 
                onClick={() => { setMfaStep('auth'); setIsLoading(false); }} 
                disabled={isLoading}
              >
                Volver
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Render original de Login / Registro
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-gray-50">
      <div id="recaptcha-container"></div>
      <Card className="w-full max-w-md">
        <form onSubmit={isLogin ? handleLogin : handleSignup}>
          <CardHeader className="text-center">
            <Link href="/" className="flex items-center justify-center gap-2 mb-2">
                <Sailboat className="h-8 w-8 text-primary" />
                <h1 className="text-3xl font-bold text-primary">UCarga</h1>
            </Link>
            <CardDescription>Tu solución integral de logística.</CardDescription>
          </CardHeader>

          {isLogin ? (
            // Login View
            <>
              <CardContent className="space-y-4">
                 <CardTitle className="text-xl text-center mb-4">Iniciar Sesión</CardTitle>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" placeholder="usuario@ejemplo.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Contraseña</Label>
                    <Button 
                      variant="link" 
                      type="button" 
                      onClick={handleResetPassword} 
                      disabled={isLoading} 
                      className="p-0 h-auto text-xs font-normal text-muted-foreground hover:text-primary"
                    >
                      ¿Olvidaste tu contraseña?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Ingresando...' : 'Ingresar'}</Button>
                <Separator />
                <p className="text-sm">
                  ¿No tienes una cuenta?{' '}
                  <Button variant="link" type="button" onClick={() => setIsLogin(false)} className="p-0 h-auto" disabled={isLoading}>
                    Regístrate
                  </Button>
                </p>
              </CardFooter>
            </>
          ) : (
            // Signup View
            <>
              <CardContent className="space-y-4">
                <CardTitle className="text-xl text-center mb-4">Crear Cuenta</CardTitle>
                
                <div className="space-y-2">
                   <Label>Soy...</Label>
                  <RadioGroup value={role} onValueChange={(value) => setRole(value as UserRole)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="empresa" id="r-empresa-signup" disabled={isLoading} />
                      <Label htmlFor="r-empresa-signup">Empresa (Cargas)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="transportista" id="r-transportista-signup" disabled={isLoading} />
                      <Label htmlFor="r-transportista-signup">Transportista</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {role === 'empresa' ? (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Nombre de la Empresa</Label>
                      <Input id="companyName" type="text" placeholder="Mi Empresa S.A. de C.V." required value={companyName} onChange={e => setCompanyName(e.target.value)} disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="rfc">RFC</Label>
                      <Input id="rfc" type="text" placeholder="ABCD123456XYZ" required value={rfc} onChange={e => setRfc(e.target.value)} disabled={isLoading} />
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="phone">Número de Celular (Para el SMS de verificación)</Label>
                      <Input id="phone" type="tel" placeholder="5512345678" required value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
                      <p className="text-xs text-gray-500">Ingresa tu celular a 10 dígitos. Recibirás un SMS para activar la cuenta.</p>
                    </div>
                     <div className="space-y-2">
                      <Label htmlFor="address">Dirección Fiscal</Label>
                      <Textarea id="address" placeholder="Av. Siempre Viva 123, Springfield" required value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="name">Nombre Completo (Persona Física o Razón Social)</Label>
                      <Input id="name" type="text" placeholder="Tu nombre o el de tu empresa" required value={fullName} onChange={e => setFullName(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="rfc-transportista">RFC</Label>
                      <Input id="rfc-transportista" type="text" placeholder="Tu RFC" required value={rfc} onChange={e => setRfc(e.target.value)} disabled={isLoading} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone-transportista">Número de Celular (Para el SMS de verificación)</Label>
                        <Input id="phone-transportista" type="tel" placeholder="5512345678" required value={phone} onChange={e => setPhone(e.target.value)} disabled={isLoading} />
                        <p className="text-xs text-gray-500">Ingresa tu celular a 10 dígitos. Recibirás un SMS para activar la cuenta.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address-transportista">Dirección Fiscal</Label>
                      <Textarea id="address-transportista" placeholder="Av. Siempre Viva 123, Springfield" required value={address} onChange={e => setAddress(e.target.value)} disabled={isLoading} />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo Electrónico</Label>
                  <Input id="signup-email" type="email" placeholder="usuario@ejemplo.com" required value={email} onChange={e => setEmail(e.target.value)} disabled={isLoading} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showSignupPassword ? 'text' : 'password'} required value={password} onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full px-3"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      disabled={isLoading}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4 text-muted-foreground" /> : <Eye className="h-4 w-4 text-muted-foreground" />}
                    </Button>
                  </div>
                </div>

              </CardContent>
              <CardFooter className="flex-col gap-4">
                <Button type="submit" className="w-full" disabled={isLoading}>{isLoading ? 'Creando cuenta...' : 'Crear Cuenta'}</Button>
                 <Separator />
                <p className="text-sm">
                  ¿Ya tienes una cuenta?{' '}
                  <Button variant="link" type="button" onClick={() => setIsLogin(true)} className="p-0 h-auto" disabled={isLoading}>
                    Inicia Sesión
                  </Button>
                </p>
              </CardFooter>
            </>
          )}
        </form>
      </Card>
    </div>
  );
}

export default function AuthPage() {
    return (
        <Suspense fallback={<div>Cargando...</div>}>
            <AuthPageContent />
        </Suspense>
    );
}
