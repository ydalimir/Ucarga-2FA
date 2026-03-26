import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map } from "lucide-react";

export default function TrackingPage() {
  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="mb-6 text-3xl font-bold text-primary">Rastreo de Unidad</h1>
      <Card>
        <CardHeader>
          <CardTitle>Ubicación en Tiempo Real</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="aspect-video w-full flex flex-col items-center justify-center rounded-lg bg-muted text-muted-foreground">
             <Map className="h-16 w-16 mb-4" />
             <p className="text-center">El mapa de rastreo se mostrará aquí.</p>
             <p className="text-sm text-center">La integración con el servicio de mapas está pendiente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
