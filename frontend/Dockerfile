FROM node:18-alpine AS build

WORKDIR /app

# Install deps (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .

# Set API URLs for production build — Nginx proxies these
ENV VITE_API_URL=""
ENV VITE_ML_API_URL="/ml"

RUN npm run build

# --- Runtime stage (tiny Nginx image) ---
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q --spider http://localhost/ || exit 1
