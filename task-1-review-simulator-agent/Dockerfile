FROM node:20-slim AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY client/package*.json ./client/
RUN cd client && npm ci

FROM deps AS build

WORKDIR /app
COPY . .

RUN npm run build
RUN cd client && npm run build

FROM node:20-slim AS runner

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

CMD ["npm", "run", "start"]
