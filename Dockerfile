FROM node:20-alpine
WORKDIR /app

# Copy everything
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

# Install + build + prune
RUN npm install --no-audit --no-fund --omit=optional && \
    npm run build && \
    npm prune --omit=dev && \
    mkdir -p public

EXPOSE 8080
USER node

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
