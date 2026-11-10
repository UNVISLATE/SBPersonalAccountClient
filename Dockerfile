# syntax=docker/dockerfile:1

FROM node:22-alpine AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_MEDIA_BASE_URL=/api/media
ARG VITE_APP_VERSION=""

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_MEDIA_BASE_URL=$VITE_MEDIA_BASE_URL \
    VITE_APP_VERSION=$VITE_APP_VERSION

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

FROM nginx:alpine AS runtime

RUN rm -rf /usr/share/nginx/html/*

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/40-env-config.sh /docker-entrypoint.d/40-env-config.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/40-env-config.sh && chmod +x /docker-entrypoint.d/40-env-config.sh

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
