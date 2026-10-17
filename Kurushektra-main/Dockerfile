# syntax=docker/dockerfile:1
# ── Stage 1: Build Frontend Assets ──
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies using pinned package-lock.json
COPY package*.json ./
RUN npm ci

# Copy source and compile production bundle
COPY . .
RUN npm run build

# ── Stage 2: Production Nginx Server ──
FROM nginx:1.27-alpine-slim

# Copy built artifacts to Nginx docroot
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://127.0.0.1:80/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
