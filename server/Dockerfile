
# ---- Build stage ----
FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:20-alpine
WORKDIR /app

# Run as non-root user for security
RUN addgroup -S luckyet && adduser -S luckyet -G luckyet

COPY --from=base /app/node_modules ./node_modules
COPY . .

# Uploads directory must exist + be writable
RUN mkdir -p uploads/receipts && chown -R luckyet:luckyet /app

USER luckyet

EXPOSE 5000

# Basic healthcheck — hits the root endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

CMD ["node", "server.js"]


