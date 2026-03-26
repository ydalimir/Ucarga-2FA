
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileDown, History, BarChart, Users, DollarSign, FileText, FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTrips } from "@/context/trips-context";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type ReportCardProps = {
  title: string;
  description: string;
  icon: React.ElementType;
  reportType: 'trip-history' | 'cost-analysis' | 'carrier-performance' | 'activity-log';
};

const companyReports: Omit<ReportCardProps, 'reportType'>[] = [
    {
        title: "Historial de Viajes",
        description: "Un resumen detallado de todos los viajes completados, pendientes y en progreso.",
        icon: History,
    },
    {
        title: "Análisis de Costos",
        description: "Desglose de los gastos por viaje, por ruta y por transportista para optimizar tu presupuesto.",
        icon: DollarSign,
    },
    {
        title: "Rendimiento de Transportistas",
        description: "Evalúa a los transportistas con los que has trabajado, incluyendo número de viajes y costos.",
        icon: Users,
    },
     {
        title: "Reporte de Actividad",
        description: "Un registro completo de todas las actividades: creación de viajes, ofertas recibidas y asignaciones.",
        icon: BarChart,
    },
];

const ReportCard = ({ title, description, icon: Icon, reportType }: ReportCardProps) => {
    const { toast } = useToast();
    const { trips, loading } = useTrips();

    const generateReport = (formatType: 'Excel' | 'PDF') => {
        if (loading) {
            toast({ title: "Por favor espera", description: "Los datos aún se están cargando."});
            return;
        }

        if (reportType !== 'trip-history') {
             toast({
                title: `Funcionalidad Pendiente`,
                description: `La generación de este reporte estará disponible próximamente.`,
            });
            return;
        }

        const data = trips.map(trip => ({
            'ID Embarque': trip.shipmentId,
            'Origen': trip.origin,
            'Destino': trip.destination,
            'Estado': trip.status,
            'Presupuesto (MXN)': trip.budget,
            'Transportista Asignado': trip.assignedCarrierName || 'N/A',
            'Precio Final': trip.finalPrice || 'N/A',
            'Fecha de Carga': format(new Date(trip.pickupDate), "PPP p", { locale: es }),
            'Fecha de Entrega': format(new Date(trip.deliveryDate), "PPP p", { locale: es }),
            'Peso Total': `${trip.totalWeight} ${trip.weightUnit}`,
            'Tipo de Camión': trip.truckType,
        }));

        if (formatType === 'Excel') {
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial de Viajes');
            XLSX.writeFile(workbook, 'historial_de_viajes.xlsx');
        } else if (formatType === 'PDF') {
            const doc = new jsPDF();
            doc.text("Historial de Viajes", 14, 16);
            autoTable(doc, {
                head: [Object.keys(data[0])],
                body: data.map(row => Object.values(row)),
                startY: 20,
                theme: 'striped',
                headStyles: { fillColor: [38, 50, 56] },
            });
            doc.save('historial_de_viajes.pdf');
        }


        toast({
            title: "Reporte Generado",
            description: `Tu reporte se ha descargado en formato ${formatType}.`,
        });
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <div className="p-3 bg-muted rounded-full">
                    <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </div>
            </CardHeader>
            <CardFooter className="mt-auto">
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button className="w-full">
                            <FileDown className="mr-2 h-4 w-4" />
                            Descargar Reporte
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => generateReport('Excel')}>
                             <FileSpreadsheet className="mr-2 h-4 w-4" />
                            <span>Descargar Excel</span>
                        </DropdownMenuItem>
                         <DropdownMenuItem onClick={() => generateReport('PDF')}>
                             <FileText className="mr-2 h-4 w-4" />
                            <span>Descargar PDF</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </CardFooter>
        </Card>
    );
};

export default function ReportsPage() {
    // Map report types to the data
    const reportMapping: ReportCardProps[] = [
        { ...companyReports[0], reportType: 'trip-history'},
        { ...companyReports[1], reportType: 'cost-analysis'},
        { ...companyReports[2], reportType: 'carrier-performance'},
        { ...companyReports[3], reportType: 'activity-log'},
    ]

  return (
    <div className="container mx-auto p-4 md:p-6">
      <h1 className="mb-6 text-3xl font-bold text-primary">Reportes</h1>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {reportMapping.map((report) => (
            <ReportCard key={report.title} {...report} />
        ))}
      </div>
    </div>
  );
}
