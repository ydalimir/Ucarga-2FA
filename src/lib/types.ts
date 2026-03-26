

import type { Timestamp } from 'firebase/firestore';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type Rating = {
    id: string;
    tripId: string;
    carrierId: string;
    companyId: string;
    stars: number;
    comment?: string;
    createdAt: Timestamp;
}

export type Bid = {
  id: string;
  tripId: string;
  carrierId: string;
  creatorId: string; // The user ID of the company that created the trip
  carrierName: string;
  carrierPhotoUrl?: string; // Photo URL of the carrier company
  amount: number;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  status: 'pending' | 'accepted' | 'rejected';
  // Fleet selection for the bid
  selectedDriverId?: string;
  selectedVehicleId?: string;
  selectedTrailerId?: string;
  selectedDriverName?: string;
  selectedVehicleInfo?: string;
  selectedTrailerInfo?: string;
  selectedDriverPhotoUrl?: string; // Driver's photo URL
}

export type ChatMessage = {
  id: string;
  senderId: string;
  text?: string; // Text is now optional
  timestamp: Timestamp;
  read?: boolean;
  // File attachment fields
  fileUrl?: string;
  fileName?: string;
  fileType?: string; // e.g., 'image/jpeg', 'application/pdf'
  fileSize?: number;
}

export type TripDocument = {
  name: string;
  url: string;
  uploadedAt: string;
  visibility: 'publico' | 'privado';
  type: 'Carta Porte' | 'Ficha Técnica' | 'Otro';
}

export type License = {
    licenseNumber?: string;
    licenseType?: 'B' | 'E';
    issueDate?: string; // ISO Date string
    expirationDate?: string; // ISO Date string
    frontScanUrl?: string;
    frontScanName?: string;
    backScanUrl?: string;
    backScanName?: string;
};

export type Insurance = {
    company?: string;
    policyNumber?: string;
    expirationDate?: string; // ISO Date string
    policyDocumentUrl?: string;
};

export type IdentityDocument = {
    number?: string;
    frontUrl?: string;
    frontName?: string;
    backUrl?: string;
    backName?: string;
};

export type DocumentWithUrl = {
    url: string;
    name?: string;
};

export type Driver = {
    id: string;
    name: string;
    phone: string;
    operatorNumber?: string;
    photoURL?: string;
    // Documentación
    identityDocument?: IdentityDocument;
    license?: License;
    criminalRecordCert?: DocumentWithUrl;
    medicalExam?: DocumentWithUrl;
    curp?: string;
    rfc?: string;
    proofOfAddress?: string; // This remains as a text field as requested
    lifeInsurance?: DocumentWithUrl;
    trainingCert?: DocumentWithUrl;
    noInfractionsCert?: DocumentWithUrl;
};

export type Vehicle = {
    id: string;
    type: 'Camioneta pick-up' | 'Camión tipo panel (van)' | 'Camión rabón' | 'Camión de redilas mediano' | 'Camión torton' | 'Tráiler (tractocamión con caja seca o plataforma)' | 'Camión caja seca' | 'Camión refrigerado' | 'Camión de redilas' | 'Camión plataforma' | 'Camión cisterna (pipa)' | 'Camión de volteo' | 'Camión jaula ganadera 🐄' | 'Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅' | 'Rabón' | 'Torton' | 'Tractocamión con caja seca, plataforma o jaula' | 'otro';
    otherType?: string;
    brand: string;
    model: string;
    year: number;
    licensePlate: string;
    loadCapacity?: number; // in kg
    photoUrl?: string;
    // Documentos
    circulationCardUrl?: string;
    circulationCardName?: string;
    insurancePolicyUrl?: string;
    insurancePolicyName?: string;
    vehicleInspectionUrl?: string;
    vehicleInspectionName?: string;
    sctPermitUrl?: string;
    sctPermitName?: string;
    maintenanceLogUrl?: string;
    maintenanceLogName?: string;
    // Features
    hasGps: boolean;
    gpsLink?: string; // Link for the GPS
};

export type Trailer = {
    id: string;
    type: 'Caja Seca' | 'Refrigerada' | 'Plataforma' | 'Jaula' | 'Otro';
    otherType?: string;
    length: '48 ft' | '53 ft' | 'Otro';
    specialConditions?: string; // e.g., "Refrigeración -20C, Riel logístico"
    photoUrl?: string;
    // New legal and technical requirements
    licensePlate: string;
    economicNumber?: string;
    circulationCardUrl?: string;
    circulationCardName?: string;
    insurancePolicyUrl?: string;
    insurancePolicyName?: string;
    mechanicalInspectionUrl?: string;
    mechanicalInspectionName?: string;
    sctPermitUrl?: string;
    sctPermitName?: string;
};


export type CarrierProfileData = {
    uid: string;
    role: 'transportista' | 'empresa';
    email: string;
    
    // Conductor / Empresa
    fullName?: string; // Carrier's main contact name or company name
    companyName?: string; // Company
    description?: string;
    photoURL?: string;
    phone?: string;
    address?: string;
    rfc?: string;
    
    // Carrier specific fleet management
    drivers?: Driver[];
    vehicles?: Vehicle[]; // Trucks
    trailers?: Trailer[];
    tokenBalance?: number;

    // Carrier specific legacy fields (to be reviewed/migrated)
    dateOfBirth?: string; 
    identityDocument?: IdentityDocument;
    insurance?: Insurance;
    additionalDocuments?: { name: string, url: string }[];
    rating?: number;
    ratingCount?: number;

    // Company specific
    taxSituationUrl?: string;
    taxSituationName?: string;
    
    createdAt: Timestamp;
    updatedAt?: Timestamp;
};


export type Trip = {
  id: string;
  shipmentId: string;
  status: 'Pendiente' | 'Asignado' | 'En Progreso' | 'En Espera de Pago' | 'Pagado' | 'Completado' | 'Pausado';
  createdAt: Timestamp;
  creatorId: string; // User ID of the company who created the trip
  isRated?: boolean; // To track if a company has rated this trip

  // Assignment
  assignedCarrierId?: string;
  assignedCarrierName?: string;
  finalPrice?: number;
  assignedDriverName?: string;
  assignedVehicleInfo?: string;
  assignedTrailerInfo?: string;
  assignedDriverPhotoUrl?: string;


  // Carga
  cargoDescription: string;
  cargoType: 'Maquinaria pesada' | 'Mercancía comercial' | 'Contenedores' | 'Carga refrigerada' | 'Ganado' | 'Instrumentos musicales' | 'Vehículos' | 'Muebles' | 'Obras de arte' | 'Otros';
  otherCargoType?: string;
  totalWeight: number;
  weightUnit: 'kg' | 'lb' | 'ton';
  volume?: number;
  dimensions: string; // "1.2m x 1.5m"
  packageCount: number;
  packageType: 'pieza' | 'set' | 'paquete' | 'docena' | 'par' | 'caja' | 'bulto' | 'rollo' | 'pallet' | 'tambor' | 'master_box' | 'contenedor' | 'ton_kg' | 'litro_galon';
  packagingType?: 'Cartón corrugado' | 'Cartón sólido o microcorrugado' | 'Madera' | 'Metálica' | 'Plástica' | 'Compuesta (mixta)' | 'Otro';
  otherPackagingType?: string;
  merchandiseValue?: number;
  merchandiseCurrency?: 'EUR' | 'MXN' | 'USD' | 'JPY';
  requiresInsurance: 'yes' | 'no';
  isStackable: 'yes' | 'no';
  isShared: 'yes' | 'no';
  merchandisePhotos?: string[]; // URLs de las fotos de la mercancía

  // Origen y Destino
  origin: string; // City, State
  originAddress: string;
  destination: string; // City, State
  destinationAddress: string;
  distanceKm?: number; // Distance in kilometers
  originCoords?: Coordinates;
  destinationCoords?: Coordinates;

  // Horarios
  pickupDate: string; // ISO string
  deliveryDate: string; // ISO string
  pickupDateTentative?: string; // ISO string
  deliveryDateTentative?: string; // ISO string
  
  // Condiciones
  biddingType: 'fixed' | 'auction' | 'competition';
  paymentMethod: 'transferencia' | 'efectivo' | 'credito' | 'cheque' | 'otros';
  otherPaymentMethod?: string;
  paymentTiming: 'inmediato' | 'contra entrega' | 'credito';
  paymentInstallments?: number;
  budget: number;
  observations?: string;

  // Transportista
  truckType: 'Camioneta pick-up' | 'Camión tipo panel (van)' | 'Camión rabón' | 'Camión de redilas mediano' | 'Camión torton' | 'Tráiler (tractocamión con caja seca o plataforma)' | 'Camión caja seca' | 'Camión refrigerado' | 'Camión de redilas' | 'Camión plataforma' | 'Camión cisterna (pipa)' | 'Camión de volteo' | 'Camión jaula ganadera 🐄' | 'Camión de redilas con lona (ideal para frutas y verduras) 🥦🍅' | 'Rabón' | 'Torton' | 'Tractocamión con caja seca, plataforma o jaula' | 'otro';
  otherTruckType?: string;
  requiresGps: 'yes' | 'no';
  requiresCarrierAssist: 'yes' | 'no';
  requiresCrane: 'yes' | 'no';
  requiresEscort: 'yes' | 'no';
  requiredLicenseType?: 'B' | 'C' | 'E';
  destinationContact?: string;
  routeType: 'caseta' | 'libre';
  
  documents: TripDocument[];

  // Dimensiones (opcional)
  length?: number;
  width?: number;
  height?: number;
  lengthUnit?: 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi';
  widthUnit?: 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi';
  heightUnit?: 'mm' | 'cm' | 'm' | 'km' | 'in' | 'ft' | 'yd' | 'mi';


  // Old fields to be deprecated/reviewed - keep for now to avoid breaking other parts
  miles: number;
  price: number;
  cargoDetails: string;
  addresses: {
    pickup: string;
    delivery: string;
  };
  bidInfo: string;
  estimatedTimes: { label: string; time: string; status: 'pending' | 'completed' }[];
  notes: { author: string; message: string; timestamp: string }[];
  weight: number;
  trailerType: string;
};

export type UserProfile = {
  name: string;
  email: string;
  vehicle: string;
  avatarUrl: string;
  rating?: number;
};
