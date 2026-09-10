# syntax=docker/dockerfile:1

# ---- Build stage -------------------------------------------------------------
FROM node:22-alpine AS build
WORKDIR /workspace

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# Vite inlines env at BUILD time, so this cannot be supplied when the container runs — an image
# built without it bakes the localhost fallback in src/app/config/env.ts and cannot reach any real
# API. Declared here so a deployment build can pass --build-arg VITE_API_BASE_URL=https://…/api/v1.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npm run build

# ---- Runtime stage ------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
