FROM node:20-alpine AS base
RUN corepack enable

FROM base AS deps
WORKDIR /app
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
RUN pnpm install --frozen-lockfile || pnpm install

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
COPY tsconfig.base.json ./
RUN pnpm --filter shared build
RUN pnpm --filter api run prisma:generate
RUN pnpm --filter api build

FROM node:20-alpine AS runner
WORKDIR /app/apps/api
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/prisma ./prisma
COPY apps/api/entrypoint.sh ./entrypoint.sh
RUN chmod +x entrypoint.sh
EXPOSE 3001
ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "dist/main.js"]
