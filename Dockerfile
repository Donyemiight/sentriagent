FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache wget

COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src

RUN npm install --no-audit --no-fund --include=dev && \
    npm run build && \
    npm prune --omit=dev

EXPOSE 8080
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
