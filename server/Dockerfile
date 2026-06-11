# ---- Build stage ----
FROM node:20-alpine AS base
WORKDIR /app

# Stop puppeteer/whatsapp-web.js from trying to download Chromium during npm ci
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
RUN npm ci --omit=dev

# ---- Runtime ----
FROM node:20-alpine
WORKDIR /app

# Chromium + the shared libs whatsapp-web.js's Puppeteer needs
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji \
    dumb-init

# Use the apt-installed Chromium, not a downloaded one
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Non-root user
RUN addgroup -S luckyet && adduser -S luckyet -G luckyet

COPY --from=base /app/node_modules ./node_modules
COPY . .

# Create writable dirs BEFORE switching to non-root user
RUN mkdir -p uploads/receipts .wwebjs_auth \
    && chown -R luckyet:luckyet /app \
    && chmod 770 .wwebjs_auth

USER luckyet
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/ || exit 1

# dumb-init properly forwards signals to Chromium child processes
# (without it, SIGTERM doesn't reach Chromium and `docker compose down` hangs)
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]