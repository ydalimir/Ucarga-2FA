'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, RotateCcw, Truck, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

export interface FilterValues {
  origin?: string;
  destination?: string;
  cargoType?: 'todos' | 'Maquinaria pesada' | 'Mercancía comercial' | 'Contenedores' | 'Carga refrigerada' | 'Ganado' | 'Instrumentos musicales' | 'Vehículos' | 'Muebles' | 'Obras de arte' | 'Otros';
  pickupDate?: Date | null;
  biddingType?: 'todos' | 'fixed' | 'auction' | 'competition';
  truckType?: 'todos' | 'Camioneta pick-up' | 'Camión tipo panel (van)' | 'Camión rabón' | 'Camión de redilas mediano' | 'Camión torton' | 'Tráiler (tractocamión con caja seca o plataforma)' | 'Camión caja seca' | 'Camión refrigerado' | 'Camión de redilas' | 'Camión plataforma' | 'Camión cisterna (pipa)' | 'Camión de volteo' | 'Camión jaula ganadera 🐄' | 'Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅' | 'Rabón' | 'Torton' | 'Tractocamión con caja seca, plataforma o jaula' | 'otro';
  showCompatibleOnly?: boolean;
}

interface FiltersProps {
  filters: FilterValues;
  onFilterChange: (filters: FilterValues) => void;
  isCompanyView?: boolean;
}

const initialFilters: FilterValues = {
    origin: '',
    destination: '',
    cargoType: 'todos',
    pickupDate: null,
    biddingType: 'todos',
    truckType: 'todos',
    showCompatibleOnly: false,
};

export function Filters({ filters, onFilterChange, isCompanyView = false }: FiltersProps) {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    onFilterChange({ ...filters, [name]: value });
  };

  const handleSelectChange = (name: keyof FilterValues, value: string) => {
    onFilterChange({ ...filters, [name]: value });
  };

  const handleDateChange = (date?: Date) => {
    onFilterChange({ ...filters, pickupDate: date || null });
  };
  
  const handleSwitchChange = (checked: boolean) => {
    onFilterChange({ ...filters, showCompatibleOnly: checked });
  }

  const handleResetFilters = () => {
    onFilterChange(initialFilters);
  };

  return (
    <Card className="overflow-hidden">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="filters" className="border-none">
          <AccordionTrigger className="px-4 py-3 hover:no-underline flex items-center justify-between group">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">Filtros de Búsqueda</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                      <Label htmlFor="origin">Origen</Label>
                      <Input id="origin" name="origin" placeholder="Ciudad de Origen" value={filters.origin} onChange={handleInputChange} />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="destination">Destino</Label>
                      <Input id="destination" name="destination" placeholder="Ciudad de Destino" value={filters.destination} onChange={handleInputChange} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="pickupDate">Fecha de Carga</Label>
                      <Popover>
                          <PopoverTrigger asChild>
                              <Button
                              variant={"outline"}
                              className="w-full justify-start text-left font-normal"
                              >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {filters.pickupDate ? format(filters.pickupDate, "PPP") : <span>Cualquier fecha</span>}
                              </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                              <Calendar mode="single" selected={filters.pickupDate || undefined} onSelect={handleDateChange} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="cargoType">Tipo de Carga</Label>
                      <Select name="cargoType" value={filters.cargoType} onValueChange={(v) => handleSelectChange('cargoType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="todos">Todos los Tipos</SelectItem>
                              <SelectItem value="Maquinaria pesada">Maquinaria pesada</SelectItem>
                              <SelectItem value="Mercancía comercial">Mercancía comercial</SelectItem>
                              <SelectItem value="Contenedores">Contenedores</SelectItem>
                              <SelectItem value="Carga refrigerada">Carga refrigerada</SelectItem>
                              <SelectItem value="Ganado">Ganado</SelectItem>
                              <SelectItem value="Instrumentos musicales">Instrumentos musicales</SelectItem>
                              <SelectItem value="Vehículos">Vehículos</SelectItem>
                              <SelectItem value="Muebles">Muebles</SelectItem>
                              <SelectItem value="Obras de arte">Obras de arte</SelectItem>
                              <SelectItem value="Otros">Otros</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="biddingType">Modalidad de Oferta</Label>
                      <Select name="biddingType" value={filters.biddingType} onValueChange={(v) => handleSelectChange('biddingType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                               <SelectItem value="todos">Todas las Modalidades</SelectItem>
                              <SelectItem value="fixed">Precio Fijo</SelectItem>
                              <SelectItem value="auction">Subasta</SelectItem>
                              <SelectItem value="competition">Competencia</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="truckType">Tipo de Unidad</Label>
                      <Select name="truckType" value={filters.truckType} onValueChange={(v) => handleSelectChange('truckType', v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                               <SelectItem value="todos">Todos los Tipos</SelectItem>
                              <SelectItem value="Camioneta pick-up">Camioneta pick-up</SelectItem>
                              <SelectItem value="Camión tipo panel (van)">Camión tipo panel (van)</SelectItem>
                              <SelectItem value="Camión rabón">Camión rabón</SelectItem>
                              <SelectItem value="Camión de redilas mediano">Camión de redilas mediano</SelectItem>
                              <SelectItem value="Camión torton">Camión torton</SelectItem>
                              <SelectItem value="Tráiler (tractocamión con caja seca o plataforma)">Tráiler (tractocamión con caja seca o plataforma)</SelectItem>
                              <SelectItem value="Camión caja seca">Camión caja seca</SelectItem>
                              <SelectItem value="Camión refrigerado">Camión refrigerado</SelectItem>
                              <SelectItem value="Camión de redilas">Camión de redilas</SelectItem>
                              <SelectItem value="Camión plataforma">Camión plataforma</SelectItem>
                              <SelectItem value="Camión cisterna (pipa)">Camión cisterna (pipa)</SelectItem>
                              <SelectItem value="Camión de volteo">Camión de volteo</SelectItem>
                              <SelectItem value="Camión jaula ganadera 🐄">Camión jaula ganadera 🐄</SelectItem>
                              <SelectItem value="Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅">Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅</SelectItem>
                              <SelectItem value="Rabón">Rabón</SelectItem>
                              <SelectItem value="Torton">Torton</SelectItem>
                              <SelectItem value="Tractocamión con caja seca, plataforma o jaula">Tractocamión con caja seca, plataforma o jaula</SelectItem>
                              <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                      </Select>
                  </div>
                  
                  <div className="col-span-1 md:col-span-2 lg:col-span-1">
                       <Button onClick={handleResetFilters} variant="ghost" className="w-full">
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Limpiar Filtros
                      </Button>
                  </div>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
}