# Análise do Projeto Mapeople v2

## Status Atual

### Concluído (Phase 1 MVP)
- Monorepo pnpm (apps/web, apps/api, packages/shared)
- Docker Compose (Postgres, Redis, API NestJS, Web Next.js, Nginx)
- Schema Prisma completo (User, Resident, Territory, TerritorySession, AuditLog, Message, RefreshToken)
- Google OAuth + JWT + Refresh Token (Redis)
- RBAC (Admin, Supervisor, Voluntário)
- Resident CRUD (API + Frontend)
- Territories CRUD (API + Frontend) com polígonos no mapa
- Territory Sessions (entrar/sair de campo)
- Mapa com Google Maps (moradores + territórios + boundary Timbó)
- Dashboard com stats
- NavBar com navegação
- Nginx reverse proxy + SSL
- Backup script

### Pendências Identificadas

#### 1. packages/shared desatualizado
- `audit.ts` não tem os AuditEventTypes de Territory (TERRITORY_CREATED, etc.)
- Não tem tipos de Territory no shared
- `message.ts` não tem encryptedContent/iv

#### 2. Phase 2 — Socket.io (não iniciada)
- Usuários online em tempo real
- Chat em tempo real
- Modo ativo / compartilhamento de localização
- Nginx já tem config para /socket.io/

#### 3. Phase 3 — Segurança (não iniciada)
- E2E message encryption (schema tem campos, mas sem implementação)
- UI de Audit Log (sem página para visualizar logs)
- LGPD hardening

#### 4. Phase 4 — DevOps (não iniciada)
- Monitoring
- CI/CD

#### 5. Melhorias no código atual
- TerritoryUser type tem `picture` mas API retorna `image` (possível mismatch)
- Residents page: limit=100 no mapa pode não carregar todos
- Sem paginação no mapa para moradores
- Sem exportação de dados (DATA_EXPORTED event existe mas sem implementação)
- Sem página de perfil do usuário
- Sem página de gerenciamento de usuários (admin)
- Sem página de audit log
- Dashboard é server component mas territories page é client — inconsistência menor
