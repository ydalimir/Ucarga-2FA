
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

const Section = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <section className="space-y-4">
    <h2 className="text-2xl font-semibold border-b pb-2">{title}</h2>
    <div className="space-y-3 text-muted-foreground">{children}</div>
  </section>
);

const SubSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="space-y-2 pt-2">
    <h3 className="text-xl font-semibold">{title}</h3>
    {children}
  </div>
);


export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background text-foreground">
      <div className="container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="mb-8">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver al Inicio
            </Link>
          </Button>
        </div>
        
        <header className="mb-10">
          <h1 className="text-4xl font-bold text-primary mb-3">Aviso de privacidad de UCarga – general</h1>
          <p className="text-lg text-muted-foreground">Última modificación: 25 de Octubre de 2025</p>
        </header>

        <div className="space-y-10">
          <Section title="I. Introducción">
            <p>Las aplicaciones móviles y el sitio web de UCarga.com ponen en contacto a los transportistas con los cargadores. Para habilitar estas aplicaciones y sitios web (los «servicios»), UCarga y sus filiales y subsidiarias (colectivamente, «UCarga») recogen y utilizan cierta información sobre nuestros usuarios cuando utilizan o se comunican con nosotros en relación con nuestros servicios.</p>
            <p>Este aviso describe los datos personales que recopilamos de los usuarios de los servicios, cómo se utilizan y comparten estos datos, y las opciones de los usuarios con respecto a estos datos.</p>
          </Section>

          <Section title="II. Resumen">
            <SubSection title="A. Ámbito y aplicación">
              <p>Este aviso se aplica a los usuarios de los servicios de UCarga en cualquier parte del mundo. Este aviso se aplica a todos los usuarios de las aplicaciones, sitios web, funciones u otros servicios de UCarga en cualquier parte del mundo:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Transportistas:</strong> personas o entidades que ofrecen vehículos de motor utilizados para el transporte de mercancías</li>
                <li><strong>Conductores comerciales:</strong> personas con licencia para conducir vehículos de motor para el transporte de mercancías para o en nombre de transportistas</li>
                <li><strong>Remitentes:</strong> cualquier usuario de los servicios que se identifique como cargador, expedidor o destinatario, o que sea propietario de las mercancías transportadas</li>
                <li><strong>Despachadores:</strong> personas que asignan vehículos de motor y conductores comerciales para el transporte de mercancías</li>
              </ul>
              <p>Todas las personas sujetas a este aviso se denominan «usuarios» en este aviso. Las prácticas descritas en este aviso están sujetas a las leyes aplicables en los lugares en los que operamos. Esto significa que llevamos a cabo las prácticas descritas en este aviso en un determinado país o región sólo si lo permite la legislación de esos lugares.</p>
            </SubSection>
            <SubSection title="B. Controlador y transferencia de datos">
              <p>UCarga es el responsable del tratamiento de los datos personales recogidos en relación con el uso de los servicios de UCarga. UCarga opera y procesa datos a nivel mundial. También podemos transferir datos a países distintos de aquel en el que nuestros usuarios viven o utilizan los servicios de UCarga. Lo hacemos para cumplir nuestros acuerdos con los usuarios, como nuestras Condiciones de uso, o basándonos en el consentimiento previo de los usuarios, las decisiones de adecuación para los países pertinentes u otros mecanismos de transferencia que puedan estar disponibles en virtud de la legislación aplicable.</p>
              <p>Las preguntas, comentarios y quejas sobre las prácticas de datos de UCarga pueden enviarse aquí.</p>
            </SubSection>
          </Section>

          <Section title="III. Recogida de datos y usos">
            <SubSection title="A. Los datos que recogemos">
              <p>UCarga recoge:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Datos proporcionados por los usuarios a UCarga, por ejemplo, durante la creación de la cuenta</li>
                <li>Datos creados durante el uso de nuestros servicios, como la ubicación, el uso de la aplicación y los datos del dispositivo</li>
                <li>Datos de otras fuentes, como socios de UCarga y terceros que utilizan las API de UCarga</li>
              </ul>
              <p>Los siguientes datos son recogidos por o en nombre de UCarga:</p>
              <p><strong>1. Datos proporcionados por los usuarios.</strong> Esto incluye: Perfil del usuario, Datos demográficos, Datos enviados a través de las comunicaciones con UCarga.</p>
              <p><strong>2. Datos creados durante el uso de nuestros servicios.</strong> Esto incluye: Datos de localización, Información sobre las transacciones, Fotos, Datos de uso, Datos del dispositivo, Datos de comunicación.</p>
              <p><strong>3. Datos de otras fuentes.</strong> Por ejemplo: Podemos recibir información sobre conductores comerciales de otros usuarios; podríamos recibir información de organismos reguladores; podemos recibir nombres e información de contacto de otros usuarios; si los usuarios se relacionan con otra aplicación o sitio web que utiliza nuestra API, podemos recibir información sobre ellos; podemos recibir información de fuentes públicas y de proveedores de servicios de marketing. UCarga puede combinar los datos recogidos de estas fuentes con otros datos en su poder.</p>
            </SubSection>
            <SubSection title="B. Cómo utilizamos los datos personales">
                <p>UCarga recopila y utiliza datos para organizar un transporte fiable y conveniente de los envíos, la entrega y otros productos y servicios. También utilizamos los datos que recogemos:</p>
                <ul className="list-disc pl-6 space-y-2">
                    <li>Para mejorar la seguridad de nuestros usuarios y servicios</li>
                    <li>Para la asistencia al cliente</li>
                    <li>Para la investigación y el desarrollo</li>
                    <li>Para enviar comunicaciones de marketing y no de marketing a los usuarios</li>
                    <li>En relación con los procedimientos judiciales</li>
                </ul>
                <p>UCarga no vende ni comparte los datos personales de los usuarios con terceros para su comercialización directa, salvo con el consentimiento de los usuarios.</p>
            </SubSection>
            <SubSection title="C. Cookies y tecnologías de terceros">
                <p>UCarga y sus socios utilizan cookies y otras tecnologías de identificación en nuestras aplicaciones, sitios web, correos electrónicos y anuncios en línea para los fines descritos en este aviso, tales como: autenticar a los usuarios, recordar las preferencias y la configuración del usuario, determinar la popularidad del contenido, realizar y medir la eficacia de las campañas publicitarias, y analizar el tráfico y las tendencias del sitio.</p>
            </SubSection>
            <SubSection title="D. Intercambio y divulgación de datos">
              <p>Algunos de los productos, servicios y funciones de UCarga requieren que compartamos datos con otros usuarios o a petición de un usuario. También podemos compartir datos con nuestras filiales, subsidiarias y socios, por razones legales o en relación con reclamaciones o disputas.</p>
            </SubSection>
             <SubSection title="E. Conservación y supresión de datos">
              <p>UCarga conserva los datos del usuario durante el tiempo necesario para los fines descritos anteriormente. Los usuarios pueden solicitar la eliminación de sus cuentas en cualquier momento. UCarga puede retener los datos del usuario después de una solicitud de eliminación debido a los requisitos legales o reglamentarios o por las razones indicadas en esta política.</p>
            </SubSection>
             <SubSection title="F. Motivos para el tratamiento">
                <p>Sólo recogemos y utilizamos datos personales cuando tenemos motivos legales para hacerlo. Estos incluyen el procesamiento de los datos personales del usuario para proporcionar los servicios y funciones solicitados, para fines de los intereses legítimos de UCarga o de otras partes, para cumplir con nuestras obligaciones legales, o sobre la base del consentimiento.</p>
            </SubSection>
          </Section>
          
          <Section title="IV. Elección y transparencia">
            <p>UCarga permite a los usuarios acceder y controlar los datos que recopila, incluso a través de: Ajustes en la aplicación, Permisos de los dispositivos, y la Exclusión de la comercialización. UCarga también permite a los usuarios solicitar acceso o copias de sus datos, cambios o actualizaciones de sus cuentas, la eliminación de sus cuentas, o que UCarga restrinja su procesamiento de los datos personales del usuario.</p>
          </Section>
          
          <Section title="V. Aviso sobre las cookies">
            <p>Nosotros y nuestras filiales, terceros y otros socios utilizamos cookies y otras tecnologías de identificación en nuestros sitios web, aplicaciones móviles, comunicaciones por correo electrónico, anuncios y otros servicios en línea (colectivamente, los «Servicios en línea») con diversos fines, entre ellos: autenticar a los usuarios, recordar las preferencias y la configuración del usuario, determinar la popularidad del contenido, ofrecer y medir la eficacia de las campañas publicitarias, analizar el tráfico y las tendencias del sitio y, en general, comprender los comportamientos e intereses en línea de las personas que interactúan con nuestros Servicios en línea.</p>
          </Section>
          
           <Section title="VI. Actualizaciones de este aviso">
            <p>Es posible que actualicemos ocasionalmente este aviso. El uso de nuestros servicios después de una actualización constituye el consentimiento del aviso actualizado en la medida en que lo permita la ley.</p>
            <p>Si realizamos cambios significativos, notificaremos a los usuarios con antelación los cambios a través de las aplicaciones de UCarga o a través de otros medios, como el correo electrónico. Animamos a los usuarios a revisar periódicamente este aviso para obtener la información más reciente sobre nuestras prácticas de privacidad.</p>
          </Section>

        </div>
      </div>
    </div>
  );
}

    
