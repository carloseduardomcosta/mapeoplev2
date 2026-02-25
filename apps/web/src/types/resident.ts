export type ResidentStatus =
  | 'NAO_CONTATADO'
  | 'CONTATADO'
  | 'AUSENTE'
  | 'RECUSOU'
  | 'INTERESSADO';

export type Role = 'ADMIN' | 'SUPERVISOR' | 'VOLUNTARIO';

export interface CurrentUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
}

export interface Resident {
  id: string;
  fullName: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  notes?: string | null;
  status: ResidentStatus;
  visitDate?: string | null;
  createdById: string;
  createdBy?: { id: string; name: string };
  updatedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
