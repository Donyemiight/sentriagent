# syntax=docker/dockerfile:1.7
# SentriAgent production Dockerfile
# Optimized for Fly.io builders (5min timeout, 8GB RAM available)

# ─── Stage 1: Build ─────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install ALL deps (including devDependencies for tsc)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build TypeScript
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Prune to prod-only for runtime
RUN npm prune --omit=dev

# ─── Stage 2: Runtime ───────────────────────────────────────
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Copy production-ready node_modules + compiled JS
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package.json ./
COPY public ./public

# Run as non-root (security)
USER node

EXPOSE 8080

# Health check for Fly.io
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
