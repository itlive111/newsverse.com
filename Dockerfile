# NewsVerse runs on Node 24 because it uses the built-in `node:sqlite` driver,
# so there is no native addon to compile and no external database to install.
FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build-time database access is limited to migrations/seed on a throwaway file.
ENV DATABASE_PATH=/tmp/build.db
RUN npm run build

FROM node:24-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_PATH=/app/data/newsverse.db
RUN useradd --system --uid 1001 newsverse && mkdir -p /app/data && chown -R newsverse:newsverse /app
COPY --from=builder --chown=newsverse:newsverse /app/.next ./.next
COPY --from=builder --chown=newsverse:newsverse /app/node_modules ./node_modules
COPY --from=builder --chown=newsverse:newsverse /app/package.json ./package.json
COPY --from=builder --chown=newsverse:newsverse /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=newsverse:newsverse /app/migrations ./migrations
COPY --from=builder --chown=newsverse:newsverse /app/public ./public
COPY --from=builder --chown=newsverse:newsverse /app/scripts ./scripts
COPY --from=builder --chown=newsverse:newsverse /app/src ./src
COPY --from=builder --chown=newsverse:newsverse /app/tsconfig.json ./tsconfig.json
USER newsverse
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["npm", "start"]
