# Mapeople v2.0.0 — Changelog Completo

## Resumo das Implementações

Todas as funcionalidades foram implementadas seguindo a ordem de prioridade: correções rápidas, Phase 2 (Socket.io/Real-time), Phase 3 (Segurança/Auditoria/LGPD) e Extras.

---

## Correções Rápidas

### Mismatch `picture` vs `image`
- **Problema**: A API retorna `image` (campo Prisma), mas o frontend usava `picture` em vários tipos e componentes.
- **Correção**: Alinhado todo o frontend para usar `image`.
- **Arquivos alterados**:
  - `apps/web/src/types/resident.ts` — `CurrentUser.picture` → `CurrentUser.image`
  - `apps/web/src/types/territory.ts` — `TerritoryUser.picture` → `TerritoryUser.image`
  - `apps/web/src/app/dashboard/page.tsx` — referências atualizadas
  - `apps/web/src/app/territories/page.tsx` — referências atualizadas
  - `apps/web/src/app/map/page.tsx` — referências atualizadas
  - `apps/web/src/app/invites/page.tsx` — `PendingUser.picture` → `PendingUser.image`
  - `apps/web/src/app/invites/InvitesClient.tsx` — referências atualizadas

### `packages/shared` desatualizado
- **Problema**: Os `AuditEventType` de Territory não estavam no pacote compartilhado.
- **Correção**: Adicionados `TERRITORY_CREATED`, `TERRITORY_UPDATED`, `TERRITORY_DELETED`, `TERRITORY_SESSION_STARTED`, `TERRITORY_SESSION_ENDED`, `DATA_EXPORTED`.
- **Arquivo**: `packages/shared/src/types/audit.ts`

---

## Phase 2 — Socket.io / Real-time

### 2a. WebSocket Gateway (Backend)
- **Arquivo**: `apps/api/src/events/events.gateway.ts`
- Autenticação JWT no handshake WebSocket
- Tracking de usuários online via Redis (Sets + Hashes)
- Broadcast de presença (connect/disconnect)
- Suporte a múltiplas abas por usuário (contagem de conexões)
- Limpeza automática de dados ao desconectar

### 2a. Indicador de Usuários Online (Frontend)
- **Arquivo**: `apps/web/src/components/OnlineUsersPanel.tsx`
- Painel dropdown na NavBar com lista de usuários online
- Avatares e nomes em tempo real
- Contador verde no ícone

### 2a. Socket Provider
- **Arquivo**: `apps/web/src/components/SocketProvider.tsx`
- Context React para compartilhar conexão Socket.io
- Upload automático de chave pública E2E ao conectar
- **Arquivo**: `apps/web/src/lib/useSocket.ts` — Hook de conexão

### 2a. AuthenticatedLayout
- **Arquivo**: `apps/web/src/components/AuthenticatedLayout.tsx`
- Wrapper para páginas autenticadas com SocketProvider
- Aplicado em: territories, map, residents, chat, audit, admin, profile

### 2b. Chat em Tempo Real
- **Backend**:
  - `apps/api/src/messages/messages.service.ts` — CRUD de mensagens
  - `apps/api/src/messages/messages.controller.ts` — REST endpoints
  - `apps/api/src/messages/messages.module.ts`
  - DTOs: `send-message.dto.ts`, `query-messages.dto.ts`
  - Integração com EventsGateway para entrega em tempo real
- **Frontend**:
  - `apps/web/src/app/chat/page.tsx` — Interface completa de chat
  - `apps/web/src/types/chat.ts` — Tipos TypeScript
  - Lista de conversas, janela de mensagens, indicador de digitação
  - Criptografia E2E transparente (encrypt ao enviar, decrypt ao receber)

### 2c. Compartilhamento de Localização
- **Backend**: Eventos `location:start`, `location:update`, `location:stop` no EventsGateway
- **Frontend**:
  - `apps/web/src/lib/useLocationSharing.ts` — Hook de geolocalização
  - Integração no mapa: marcadores azuis pulsantes com nome do usuário
  - Botão "Compartilhar Localização" no painel do mapa
  - Atualização a cada 10 segundos via `watchPosition`

---

## Phase 3 — Segurança & Auditoria

### 3a. Página de Audit Log
- **Backend**:
  - `apps/api/src/audit/audit.service.ts` — Busca paginada com filtros
  - `apps/api/src/audit/audit.controller.ts` — Endpoints admin-only
  - `apps/api/src/audit/audit.module.ts`
  - DTO: `query-audit.dto.ts`
- **Frontend**:
  - `apps/web/src/app/audit/page.tsx` — Interface completa
  - Filtros por tipo de evento, usuário, período
  - Paginação, detalhes expandíveis com metadata JSON
  - Link na NavBar (visível apenas para ADMIN)

### 3b. Criptografia E2E (ECDH + AES-GCM)
- **Backend**:
  - Campo `publicKey` adicionado ao modelo `User` (Prisma)
  - Migration: `20260225200000_add_user_public_key`
  - Endpoints: `PUT /api/auth/public-key`, `GET /api/auth/public-key/:userId`
- **Frontend**:
  - `apps/web/src/lib/crypto.ts` — Implementação completa:
    - Geração de par de chaves ECDH (P-256) via Web Crypto API
    - Armazenamento seguro no IndexedDB
    - Derivação de chave compartilhada via ECDH + HKDF
    - Encrypt/Decrypt com AES-256-GCM + IV aleatório
    - Fallback para chave simétrica quando chave pública não disponível

### 3c. LGPD Hardening
- **Backend**:
  - `apps/api/src/common/sanitize.interceptor.ts` — Interceptor para sanitizar logs
  - `GET /api/auth/my-data` — Exportação de dados pessoais (direito de acesso)
  - `DELETE /api/auth/my-account` — Exclusão de conta (direito ao esquecimento)
  - Audit log para todas as ações LGPD
- **Frontend**:
  - `apps/web/src/app/privacy/page.tsx` — Página de Privacidade e Dados
  - Botão "Exportar meus dados" (download JSON)
  - Botão "Excluir minha conta" (com confirmação dupla)
  - Informações sobre direitos LGPD

---

## Extras

### Gerenciamento de Usuários (Admin)
- **Backend**:
  - `apps/api/src/users/users.service.ts` — CRUD de usuários
  - `apps/api/src/users/users.controller.ts` — Endpoints admin-only
  - `apps/api/src/users/users.module.ts`
  - DTOs: `query-users.dto.ts`, `update-user.dto.ts`
  - Endpoints: `GET /api/users`, `GET /api/users/stats`, `GET /api/users/:id`, `PATCH /api/users/:id`
- **Frontend**:
  - `apps/web/src/app/admin/users/page.tsx` — Interface completa
  - Cards de estatísticas (total, ativos, inativos, admins)
  - Filtros por nome, role, status
  - Botões para ativar/desativar e alterar role
  - Audit log automático para cada alteração

### Perfil do Usuário
- **Frontend**:
  - `apps/web/src/app/profile/page.tsx`
  - Avatar, nome, e-mail, role, data de cadastro
  - Links rápidos para Privacidade e Gerenciar Usuários (admin)
  - Ícone de perfil na NavBar (foto do Google)

### Exportação CSV de Moradores
- **Backend**:
  - `GET /api/residents/export/csv` — Exporta todos os moradores em CSV
  - BOM UTF-8 para compatibilidade com Excel
  - Audit log automático (`DATA_EXPORTED`)
- **Frontend**:
  - Botão "CSV" na página de moradores (ao lado de "Novo Morador")
  - Download automático com nome `moradores-YYYY-MM-DD.csv`

### Paginação do Mapa
- **Correção**: O mapa carregava apenas 100 moradores.
- **Melhoria**: Agora carrega **todos** os moradores com paginação automática (loop de páginas de 100).
- **Log**: Console mostra quantos moradores e páginas foram carregados.

### NavBar Melhorada
- Foto do perfil do usuário (Google avatar) com link para `/profile`
- Links condicionais: "Auditoria" só aparece para ADMIN
- Fetch do role do usuário para controle de visibilidade

### Dashboard Atualizado
- Novos cards de acesso rápido: Chat, Gerenciar Usuários, Auditoria
- Cards admin-only com ícones diferenciados
- Versão atualizada para v2.0.0

---

## Novos Arquivos Criados (total: 28)

### Backend (API)
```
apps/api/src/events/events.gateway.ts
apps/api/src/events/events.module.ts
apps/api/src/events/index.ts
apps/api/src/messages/messages.service.ts
apps/api/src/messages/messages.controller.ts
apps/api/src/messages/messages.module.ts
apps/api/src/messages/dto/send-message.dto.ts
apps/api/src/messages/dto/query-messages.dto.ts
apps/api/src/audit/audit.service.ts
apps/api/src/audit/audit.controller.ts
apps/api/src/audit/audit.module.ts
apps/api/src/audit/dto/query-audit.dto.ts
apps/api/src/users/users.service.ts
apps/api/src/users/users.controller.ts
apps/api/src/users/users.module.ts
apps/api/src/users/dto/query-users.dto.ts
apps/api/src/users/dto/update-user.dto.ts
apps/api/src/auth/dto/data-export.dto.ts
apps/api/src/common/sanitize.interceptor.ts
apps/api/prisma/migrations/20260225200000_add_user_public_key/migration.sql
```

### Frontend (Web)
```
apps/web/src/components/SocketProvider.tsx
apps/web/src/components/OnlineUsersPanel.tsx
apps/web/src/components/AuthenticatedLayout.tsx
apps/web/src/lib/useSocket.ts
apps/web/src/lib/useLocationSharing.ts
apps/web/src/lib/crypto.ts
apps/web/src/types/chat.ts
apps/web/src/app/chat/page.tsx
apps/web/src/app/audit/page.tsx
apps/web/src/app/admin/users/page.tsx
apps/web/src/app/profile/page.tsx
apps/web/src/app/privacy/page.tsx
```

---

## Instruções de Deploy

### 1. Aplicar a migration do banco
```bash
cd /opt/mapeople/apps/api
npx prisma migrate deploy
```

### 2. Instalar dependências (se necessário)
As dependências `socket.io-client`, `@nestjs/websockets` e `@nestjs/platform-socket.io` já estão no package.json. Se não estiverem instaladas:
```bash
cd /opt/mapeople
pnpm install
```

### 3. Rebuild e restart
```bash
cd /opt/mapeople
docker compose build
docker compose up -d
```

### 4. Verificar Socket.io
O Nginx já tem a configuração para `/socket.io/` no `docker/nginx/conf.d/default.conf`. Certifique-se de que o proxy WebSocket está ativo:
```nginx
location /socket.io/ {
    proxy_pass http://api:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

---

## Novos Endpoints da API

| Método | Rota | Descrição | Auth |
|--------|------|-----------|------|
| GET | `/api/messages/conversations` | Lista conversas do usuário | JWT |
| GET | `/api/messages/conversation/:userId` | Mensagens com um usuário | JWT |
| POST | `/api/messages` | Enviar mensagem | JWT |
| PATCH | `/api/messages/:id/read` | Marcar como lida | JWT |
| GET | `/api/audit` | Listar audit logs | Admin |
| GET | `/api/audit/event-types` | Tipos de evento disponíveis | Admin |
| GET | `/api/users` | Listar usuários | Admin |
| GET | `/api/users/stats` | Estatísticas de usuários | Admin |
| GET | `/api/users/:id` | Detalhes de um usuário | Admin |
| PATCH | `/api/users/:id` | Atualizar role/status | Admin |
| PUT | `/api/auth/public-key` | Salvar chave pública E2E | JWT |
| GET | `/api/auth/public-key/:userId` | Obter chave pública | JWT |
| GET | `/api/auth/my-data` | Exportar dados pessoais (LGPD) | JWT |
| DELETE | `/api/auth/my-account` | Excluir conta (LGPD) | JWT |
| GET | `/api/residents/export/csv` | Exportar moradores em CSV | JWT |

## Eventos WebSocket (Socket.io)

| Evento | Direção | Descrição |
|--------|---------|-----------|
| `user:online` | Server → Client | Lista de usuários online |
| `user:connected` | Server → Client | Usuário ficou online |
| `user:disconnected` | Server → Client | Usuário ficou offline |
| `message:send` | Client → Server | Enviar mensagem |
| `message:new` | Server → Client | Nova mensagem recebida |
| `message:typing` | Client → Server | Indicador de digitação |
| `message:typing` | Server → Client | Alguém está digitando |
| `location:start` | Client → Server | Iniciar compartilhamento |
| `location:update` | Client → Server | Atualizar posição |
| `location:stop` | Client → Server | Parar compartilhamento |
| `location:users` | Server → Client | Posições de todos os usuários |
