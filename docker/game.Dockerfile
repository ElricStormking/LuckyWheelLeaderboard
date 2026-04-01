FROM node:20-bookworm-slim AS builder

WORKDIR /app

ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps

RUN npm ci \
  && npm run build --workspace @lucky-wheel/game \
  && npm cache clean --force

FROM nginx:1.27-alpine

COPY docker/game.nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/game/dist /usr/share/nginx/html

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
