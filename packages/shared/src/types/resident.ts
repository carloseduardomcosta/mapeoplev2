export enum ResidentStatus {
  NAO_CONTATADO = 'NAO_CONTATADO',
  CONTATADO = 'CONTATADO',
  AUSENTE = 'AUSENTE',
  RECUSOU = 'RECUSOU',
  INTERESSADO = 'INTERESSADO',
}

export interface Resident {
  id: string;
  fullName: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string;
  notes?: string;
  status: ResidentStatus;
  visitDate?: Date;
  createdById: string;
  updatedById?: string;
  createdAt: Date;
  updatedAt: Date;
}
