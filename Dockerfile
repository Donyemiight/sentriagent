FROM node:20-alpine
WORKDIR /app

# Copy prebuilt dist (committed to git)
COPY package.json package-lock.json ./
COPY dist ./dist

# Install production deps only (no build needed)
RUN npm install --omit=dev --no-audit --no-fund --omit=optional

EXPOSE 8080
USER node

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/server.js"]
