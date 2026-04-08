FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps
COPY docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh

RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*

RUN npm ci \
  && npm run build --workspace @lucky-wheel/contracts \
  && npm run db:generate --workspace @lucky-wheel/api \
  && npm run build --workspace @lucky-wheel/api \
  && mkdir -p node_modules/@lucky-wheel/contracts/dist \
  && cp -a apps/api/dist/contracts/src/. node_modules/@lucky-wheel/contracts/dist/ \
  && chmod +x /usr/local/bin/api-entrypoint.sh \
  && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=4000
ENV DATABASE_URL=file:/data/dev.db
ENV UPLOAD_ROOT=/uploads

VOLUME ["/data", "/uploads"]

EXPOSE 4000

CMD ["api-entrypoint.sh"]
