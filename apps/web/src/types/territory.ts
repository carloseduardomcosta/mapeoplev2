export interface PolygonPoint {
  lat: number;
  lng: number;
}

export interface TerritoryUser {
  id: string;
  name: string;
  image?: string | null;
}

export interface TerritorySession {
  id: string;
  territoryId: string;
  userId: string;
  startedAt: string;
  endedAt?: string | null;
  isActive: boolean;
  user?: TerritoryUser;
}

export interface Territory {
  id: string;
  number: number;
  name: string;
  description?: string | null;
  polygon: PolygonPoint[];
  color: string;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: TerritoryUser;
  sessions?: TerritorySession[];
  activeSession?: TerritorySession & { user: TerritoryUser } | null;
}

export interface ActiveSessionWithTerritory extends TerritorySession {
  user: TerritoryUser;
  territory: Territory;
}
