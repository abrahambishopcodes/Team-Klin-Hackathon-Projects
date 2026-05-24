# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY client/package*.json ./client/
RUN cd client && npm ci

# Stage 2: Build
FROM deps AS build
WORKDIR /app
COPY . .
RUN npm run build
RUN cd client && npm run build

# Stage 3: Runner (Production)
FROM node:20-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# Copy only the necessary server files and install prod deps
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built assets from the 'build' stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/client/dist ./client/dist

# If your server requires the client's package.json (e.g. for production paths), uncomment below:
# COPY --from=build /app/client/package.json ./client/package.json

EXPOSE 3000

CMD ["npm", "run", "start"]