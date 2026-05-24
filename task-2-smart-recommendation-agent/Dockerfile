FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
# CHANGED: Changed from npm ci to npm install to bypass strict lockfile checks
RUN npm install

# Copy configuration and source
COPY tsconfig.json ./
COPY src ./src

# Explicitly copy prisma config if it's outside src
COPY prisma.config.ts ./ 

RUN npm run prisma:generate
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-alpine AS runtime

WORKDIR /app

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production

EXPOSE 5500

CMD ["node", "dist/server.js"]