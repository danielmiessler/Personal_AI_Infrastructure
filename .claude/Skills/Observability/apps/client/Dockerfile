# Observability Client - Multi-stage Build
# Stage 1: Build the Vue application
FROM oven/bun:1-alpine AS builder

WORKDIR /app

# Build args for environment variables
ARG VITE_WS_URL=ws://localhost:5172/stream

# Copy package files
COPY package.json bun.lock* ./

# Install dependencies
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Build the application (skip type checking - existing TS errors in upstream)
# Environment variables are baked into the build
RUN VITE_WS_URL=$VITE_WS_URL bun run vite build

# Stage 2: Serve with nginx
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy built assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create custom nginx config for port 5172
RUN echo 'server { \
    listen 5172; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
    # API proxy to backend \
    location /api { \
        proxy_pass http://observability-server:4000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
    # WebSocket proxy \
    location /stream { \
        proxy_pass http://observability-server:4000; \
        proxy_http_version 1.1; \
        proxy_set_header Upgrade $http_upgrade; \
        proxy_set_header Connection "upgrade"; \
        proxy_set_header Host $host; \
        proxy_cache_bypass $http_upgrade; \
    } \
}' > /etc/nginx/conf.d/default.conf

# Expose client port
EXPOSE 5172

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:5172 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
