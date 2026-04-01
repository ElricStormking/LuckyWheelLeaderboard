FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps

RUN npm ci \
  && npm run build --workspace @lucky-wheel/admin \
  && npm cache clean --force

FROM nginx:1.27-alpine

COPY docker/admin.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/admin/dist /usr/share/nginx/html

EXPOSE 4002

CMD ["nginx", "-g", "daemon off;"]
