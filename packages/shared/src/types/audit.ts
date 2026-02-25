export enum AuditEventType {
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  RESIDENT_CREATED = 'RESIDENT_CREATED',
  RESIDENT_UPDATED = 'RESIDENT_UPDATED',
  RESIDENT_DELETED = 'RESIDENT_DELETED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  MESSAGE_SENT = 'MESSAGE_SENT',
  DATA_EXPORTED = 'DATA_EXPORTED',
  INVITE_SENT = 'INVITE_SENT',
  INVITE_ACCEPTED = 'INVITE_ACCEPTED',
}

export interface AuditLog {
  id: string;
  eventType: AuditEventType;
  userId: string;
  residentId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
}
