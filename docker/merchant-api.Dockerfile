FROM node:20-bookworm-slim

WORKDIR /app

COPY package.json package-lock.json tsconfig.base.json ./
COPY apps ./apps

RUN npm ci \
  && npm run build --workspace @lucky-wheel/contracts \
  && npm run build --workspace @lucky-wheel/merchant-api \
  && mkdir -p node_modules/@lucky-wheel/contracts/dist \
  && cp -a apps/merchant-api/dist/contracts/src/. node_modules/@lucky-wheel/contracts/dist/ \
  && npm cache clean --force

ENV NODE_ENV=production
ENV PORT=4003

EXPOSE 4003

CMD ["node", "apps/merchant-api/dist/merchant-api/src/main.js"]
