FROM node:22-alpine

WORKDIR /app

COPY lib lib
COPY services/order-sync services/order-sync

WORKDIR /app/services/order-sync

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "server.mjs"]
