FROM node:20-alpine
WORKDIR /app

# Install wget for healthcheck (not in alpine by default)
RUN apk add --no-cache wget

# Copy prebuilt dist (committed to git) + package files
COPY package.json package-lock.json ./
COPY dist ./dist

# Install production deps only
RUN npm install --omit=dev --no-audit --no-fund --omit=optional

EXPOSE 8080
USER node

CMD ["node", "dist/server.js"]
