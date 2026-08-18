FROM node:24-alpine AS base

WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

FROM base AS dependencies

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder

COPY . .
# These values only allow the compile step to load configuration. They are not
# runtime credentials and are replaced by .env.docker when containers start.
ENV DATABASE_URI="postgresql://build:build@localhost:5432/build"
ENV PAYLOAD_SECRET="build-only-placeholder-not-a-secret"
RUN pnpm generate:importmap && pnpm build

FROM dependencies AS migration

COPY . .
CMD ["pnpm", "payload", "migrate"]

FROM node:24-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && mkdir -p /app/media \
  && chown nextjs:nodejs /app/media

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
