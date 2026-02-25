# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Private web system for registering residents visited by a door-to-door volunteer service in Timbó, SC, Brazil. Up to 20 concurrent users. Hosted on a homelab server at `app-mapeople.duckdns.org`.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend (`apps/web`) | Next.js 14 App Router, TypeScript, Tailwind CSS, NextAuth.js (Google OAuth), Socket.io Client, Google Maps JS SDK |
| Backend (`apps/api`) | NestJS, TypeScript, Prisma + PostgreSQL, Socket.io, Passport.js, JWT + refresh tokens |
| Infrastructure | PostgreSQL, Redis, Nginx (reverse proxy + SSL), Docker Compose, Certbot |
| Monorepo | pnpm workspaces — `apps/web`, `apps/api`, `packages/shared` |

Nginx routing: `/api/*` → NestJS:3001, `/*` → Next.js:3000.

---

## Commands

```bash
# Development
pnpm dev              # web + api in parallel
pnpm dev:web
pnpm dev:api
pnpm build            # all apps

# Docker (production)
docker compose up -d
docker compose logs -f api
docker compose logs -f web

# Database
pnpm --filter api prisma:migrate   # run migrations (prisma migrate dev)
pnpm --filter api prisma:generate  # regenerate Prisma client
pnpm --filter api prisma:studio    # open Prisma Studio

# Backup
bash /opt/mapeople/scripts/backup.sh
```

---

## Architecture & Key Constraints

### RBAC (3 roles: Admin, Supervisor, Voluntário)
All API routes must be protected with NestJS RBAC guards. Role capabilities:
- **Admin**: full access, delete, export, view all audit logs
- **Supervisor**: view all records, edit records in their area
- **Voluntário**: create/edit own records, view map, use chat

### Audit Log (mandatory on all write operations)
Every create, update, delete, status change, login/logout, and data export must write an `AuditLog` entry. There are no exceptions.

### Resident Status Enum
`NAO_CONTATADO | CONTATADO | AUSENTE | RECUSOU | INTERESSADO`

### Chat E2E Encryption
Messages must be encrypted before storage. `ENCRYPTION_KEY` (32-byte hex) is in `.env`.

### Auth Flow
Google OAuth only (Phase 1). Access requires pre-approved email or invite link. JWT (15min) + refresh token (7d) stored in Redis.

---

## Conventions

- **Code language:** English (variables, functions, classes, comments)
- **UI language:** Brazilian Portuguese
- **Commits:** Portuguese + conventional commits (`feat:`, `fix:`, `chore:`)
- **Branches:** `feat/nome-da-feature`, `fix/nome-do-bug`
- TypeScript strict mode in all packages
- Use `class-validator` for NestJS DTOs, `zod` for Next.js forms
- All DB access through Prisma — never raw SQL except in migrations
- After any Prisma schema change: run `prisma migrate dev`

---

## Development Phases

- **Phase 1 (MVP):** Monorepo scaffolding, Docker Compose, Prisma schema, Google OAuth + JWT, Resident CRUD, RBAC guards, Map with markers, Nginx + SSL
- **Phase 2:** Socket.io (online users, real-time chat, active mode / location sharing)
- **Phase 3:** E2E message encryption, full audit UI, LGPD hardening
- **Phase 4:** Monitoring, CI/CD

---

## Environment

- Server: Ubuntu Server 22.04 LTS, user `mapeople`, project at `/opt/mapeople`
- Docker and pnpm are installed and configured
- `.env` is populated with Google OAuth, Maps API key, and SMTP credentials (see `.env.example` for all required vars)
- VM accessed remotely via VSCode SSH
