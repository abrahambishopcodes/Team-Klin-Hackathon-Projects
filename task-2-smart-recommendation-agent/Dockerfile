
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run prisma:generate
RUN npm run build

EXPOSE 5500

CMD ["sh", "-c", "node dist/server.js"]
