FROM node:22-alpine

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY services/catalog-sync/package.json ./services/catalog-sync/
RUN cd services/catalog-sync && npm install --omit=dev

ENV NODE_PATH=/app/services/catalog-sync/node_modules

COPY lib lib
COPY services/catalog-sync services/catalog-sync

WORKDIR /app/services/catalog-sync

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.mjs"]
