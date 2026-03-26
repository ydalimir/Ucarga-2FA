
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sailboat, Truck, Building2, CheckCircle, Search, BarChart, ArrowRight, Info, Headset } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

const FeatureCard = ({ icon, title, description, link }: { icon: React.ReactNode; title: string; description: string; link: string; }) => (
  <Card className="text-left bg-secondary/50 hover:bg-secondary transition-all flex flex-col">
    <CardHeader>
        <div className="flex items-center gap-4">
          <div className="bg-primary text-primary-foreground rounded-full p-2">
              {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </div>
    </CardHeader>
    <CardContent className="flex-grow pt-0">
      <p className="text-muted-foreground">{description}</p>
    </CardContent>
    <div className="p-6 pt-0">
        <Button variant="link" asChild className="p-0 h-auto">
            <Link href={link}>
                Saber más. <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
        </Button>
    </div>
  </Card>
);

export default function LandingPage() {
    const heroImage = PlaceHolderImages.find(p => p.id === 'landing-hero');
    const carrierImage = PlaceHolderImages.find(p => p.id === 'carrier-section');
  
  return (
    <div className="flex flex-col min-h-dvh bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-primary">
            <Sailboat className="h-7 w-7" />
            <span>UCarga</span>
          </Link>
          <nav className="hidden md:flex gap-6 items-center">
             <Link href="#empresas" className="text-sm font-medium hover:text-primary transition-colors">Para Empresas</Link>
             <Link href="#transportistas" className="text-sm font-medium hover:text-primary transition-colors">Para Transportistas</Link>
             <Link href="#features" className="text-sm font-medium hover:text-primary transition-colors">Características</Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
                <Link href="/auth">Ingresar</Link>
            </Button>
            <Button asChild>
                <Link href="/auth?action=signup">Crear Cuenta</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative h-[60dvh] md:h-[70dvh] flex items-center justify-center text-center">
             {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    data-ai-hint={heroImage.imageHint}
                    fill
                    className="object-cover"
                    priority
                />
             )}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
             <div className="absolute inset-0 bg-black/50" />
            <div className="container mx-auto px-4 md:px-6 relative text-white">
                <h1 className="text-4xl md:text-6xl font-bold mb-4">La nueva era de la logística terrestre</h1>
                <p className="text-base md:text-lg max-w-3xl mx-auto mb-8">UCarga es una plataforma digital que conecta empresas que necesitan enviar mercancía con camioneros independientes o flotillas de transporte, optimizando costos, rutas y tiempos. Permite aprovechar viajes disponibles y evitar unidades vacías, generando un beneficio compartido.</p>
                <Button size="lg" asChild>
                    <Link href="/auth?action=signup">Comienza ahora</Link>
                </Button>
            </div>
        </section>

        
        {/* Features */}
        <section id="features" className="py-16 md:py-24">
            <div className="container mx-auto px-4 md:px-6">
                <div className="grid md:grid-cols-3 gap-8">
                    <FeatureCard icon={<Building2 className="h-8 w-8" />} title="Para Empresas" description="Optimiza tu logística, reduce costos y ten visibilidad total de tus embarques." link="#empresas" />
                    <FeatureCard icon={<Truck className="h-8 w-8" />} title="Para Transportistas" description="Maximiza tus ganancias, reduce tiempos muertos y encuentra cargas compatibles." link="#transportistas" />
                    <FeatureCard icon={<BarChart className="h-8 w-8" />} title="Analítica Avanzada" description="Obtén reportes detallados para optimizar tus operaciones y costos." link="/auth" />
                </div>
            </div>
        </section>

        {/* For Companies Section */}
        <section id="empresas" className="py-16 md:py-24 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 flex items-center justify-center">
                <Image src="https://res.cloudinary.com/mundodepixeles/image/upload/v1765063903/Dise%C3%B1o_sin_t%C3%ADtulo_fwriyk.png" alt="Panel de control de logística" data-ai-hint="logistics dashboard" width={500} height={500} className="rounded-lg shadow-2xl" />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Soluciones para tu empresa</h2>
                <p className="text-muted-foreground mb-6">Gestiona todos tus envíos desde una plataforma centralizada. Obtén cotizaciones instantáneas, seguimiento en tiempo real y acceso a una red de transportistas verificados.</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Accede a una red de transportistas calificados y de confianza.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Crea, asigna y monitorea tus envíos desde una sola plataforma.</p>
                  </li>
                   <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Toma decisiones informadas con datos clave sobre tus operaciones.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Reducción de costos en transporte.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Mayor disponibilidad de camiones y rutas.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Transparencia y seguridad en cada envío.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Posibilidad de compartir cargas (Carga Fraccionada).</p>
                  </li>
                </ul>
                 <Button asChild>
                    <Link href="/auth?action=signup">Registrar mi empresa</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
        
        {/* For Carriers Section */}
        <section id="transportistas" className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Soluciones para Transportistas</h2>
                <p className="text-muted-foreground mb-6">Únete a nuestra red y accede a miles de cargas disponibles. Mantén tu camión en movimiento y aumenta tu rentabilidad con rutas optimizadas y pagos seguros.</p>
                 <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Encuentra miles de cargas disponibles en todo el país.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Gestiona tus rutas y viajes de manera eficiente para aumentar tu rentabilidad.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Incremento de ingresos con cargas adicionales.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Reducción de viajes vacíos.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Acceso a una red amplia de clientes.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Tú gestionas los cobros a la empresa dadora de carga (Sin comisiones).</p>
                  </li>
                </ul>
                <Button asChild>
                    <Link href="/auth?action=signup">Registrarme como transportista</Link>
                </Button>
              </div>
               <div className="flex items-center justify-center">
                <Image src="https://res.cloudinary.com/mundodepixeles/image/upload/v1765063894/Dise%C3%B1o_sin_t%C3%ADtulo_2_kjvik7.png" alt="Truck driver" data-ai-hint="truck driver phone" width={500} height={500} className="rounded-lg shadow-2xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Duplicated Section for Carriers */}
        <section className="py-16 md:py-24 bg-secondary">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 flex items-center justify-center">
                  <Image src="https://res.cloudinary.com/mundodepixeles/image/upload/v1765063894/Dise%C3%B1o_sin_t%C3%ADtulo_1_msyilu.png" alt="Panel de control de transportista" data-ai-hint="carrier dashboard" width={500} height={500} className="rounded-lg shadow-2xl" />
              </div>
              <div className="order-1 md:order-2">
                <h2 className="text-3xl md:text-4xl font-bold text-primary mb-4">Crece con nosotros</h2>
                <p className="text-muted-foreground mb-6">Maximiza tus ingresos y reduce el tiempo muerto con nuestra plataforma. Accede a más oportunidades, gestiona tus viajes y cobra de forma segura.</p>
                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Herramientas para optimizar tus rutas y tiempos.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Plataforma 100% digital y fácil de usar.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Registros y validación de transportistas y empresas.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Optimización de rutas mediante algoritmos inteligentes.</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-6 w-6 text-primary mt-1 flex-shrink-0" />
                    <p>Modelo colaborativo: gana la empresa y gana el caminero.</p>
                  </li>
                </ul>
                 <Button asChild>
                    <Link href="/auth?action=signup">Únete a la red</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Contact Info Section */}
        <section className="py-16 md:py-24 bg-background">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto text-center border rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow">
              <div className="flex justify-center mb-4">
                  <Headset className="h-10 w-10 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">¿Necesitas más información?</h3>
              <p className="text-muted-foreground mb-4">Contacta a nuestro equipo de soporte para resolver cualquier duda.</p>
              <Button asChild variant="outline">
                <a href="mailto:info@ucarga.com">
                    info@ucarga.com
                </a>
              </Button>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="bg-primary text-primary-foreground">
        <div className="container mx-auto py-12 px-4 md:px-6">
           <div className="grid md:grid-cols-4 gap-8">
                <div>
                     <Link href="/" className="flex items-center gap-2 font-bold text-2xl">
                        <Sailboat className="h-7 w-7" />
                        <span>UCarga</span>
                    </Link>
                    <p className="text-sm text-primary-foreground/70 mt-2">Revolucionando la logística en Latinoamérica.</p>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2">Navegación</h4>
                    <ul className="space-y-2 text-sm text-primary-foreground/70">
                        <li><Link href="#empresas" className="hover:text-white">Para Empresas</Link></li>
                        <li><Link href="#transportistas" className="hover:text-white">Para Transportistas</Link></li>
                        <li><Link href="/auth" className="hover:text-white">Crear Cuenta</Link></li>
                    </ul>
                </div>
                 <div>
                    <h4 className="font-semibold mb-2">Legal</h4>
                    <ul className="space-y-2 text-sm text-primary-foreground/70">
                        <li><a href="https://res.cloudinary.com/mundodepixeles/image/upload/v1765064396/Terminos_y_Condiciones_ipgamg.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-white">Términos y Condiciones</a></li>
                        <li><a href="https://res.cloudinary.com/mundodepixeles/image/upload/v1765064379/Aviso_de_Privacidad_syng2j.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-white">Aviso de privacidad</a></li>
                    </ul>
                </div>
                 <div>
                     <h4 className="font-semibold mb-2">Contacto</h4>
                    <ul className="space-y-2 text-sm text-primary-foreground/70">
                        <li><a href="mailto:soporte@ucarga.com" className="hover:text-white">soporte@ucarga.com</a></li>
                    </ul>
                </div>
           </div>
           <div className="border-t border-primary-foreground/20 mt-8 pt-6 text-center text-sm text-primary-foreground/70">
              &copy; {new Date().getFullYear()} UCarga. Todos los derechos reservados.
           </div>
        </div>
      </footer>
    </div>
  );
}
