export enum Role {
  ADMIN = 'ADMIN',
  SUPERVISOR = 'SUPERVISOR',
  VOLUNTARIO = 'VOLUNTARIO',
}

export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
