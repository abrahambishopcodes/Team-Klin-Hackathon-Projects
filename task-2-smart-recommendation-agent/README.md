# Smart Recommendation Agent

This project contains:

- a Node.js/TypeScript backend in the repository root
- a React/Vite frontend in [`client/`](/home/abrahambishop/my_projects/team-klin-hackathon-projects/task-2-smart-recommendation-agent/client)
- Docker files for both apps
- a `docker-compose.yml` for local orchestration

Local default URLs:

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5500`
- Backend health check: `http://localhost:5500/health`

## Prerequisites

Install the following before starting:

- Docker Desktop or Docker Engine with Docker Compose
- Node.js `22.x`
- npm `10+`

The application also depends on external services:

- PostgreSQL
- Pinecone
- Voyage AI
- Groq or another compatible provider for `AI_PROVIDER_API_KEY`

## Required Environment Variables

Create a root `.env` file in the project directory with the variables below:

```env
PORT=5500
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=...
VOYAGE_API_KEY=...
AI_PROVIDER_API_KEY=...
```

Notes:

- `DATABASE_URL` is used by the running backend.
- `DIRECT_URL` is used by Prisma config for schema operations.
- `PORT` should stay `5500` for local Docker Compose unless you also update the compose file.

## Fastest Local Startup: Docker Compose

This is the recommended path for grading and reproducibility.

1. Clone the repository.
2. Create the root `.env` file.
3. From the project root, run:

```bash
docker compose up --build
```

4. Open `http://localhost:3000`.

To stop the stack:

```bash
docker compose down
```

What this starts:

- `backend` on port `5500`
- `frontend` on port `3000`

## Manual Local Startup

Use this if you do not want Docker.

### 1. Install backend dependencies

From the project root:

```bash
npm ci
```

### 2. Install frontend dependencies

From the `client` directory:

```bash
npm ci
```

### 3. Generate Prisma client

From the project root:

```bash
npm run prisma:generate
```

### 4. Push the schema to your database

This project currently includes a Prisma schema but no checked-in migrations directory, so for a fresh local database use:

```bash
npm run prisma:push
```

### 5. Start the backend

From the project root:

```bash
npm run dev
```

The backend will run on `http://localhost:5500`.

### 6. Start the frontend

In a second terminal:

```bash
cd client
npm run dev
```

Vite will print the frontend URL in the terminal, typically `http://localhost:5173`.

The frontend is configured to call `http://localhost:5500/api` by default in local development.

## Data and Demo Content

The repository already includes sampled raw data files under [`data/raw/`](/home/abrahambishop/my_projects/team-klin-hackathon-projects/task-2-smart-recommendation-agent/data/raw).

Important distinction:

- raw files existing on disk does **not** mean your database and Pinecone index are already populated
- recommendation and demo-user flows depend on PostgreSQL and Pinecone having data

## Optional Bootstrap Scripts

If you want to rebuild or repopulate the data layer yourself, these scripts exist:

### Download sample dataset

```bash
npm run download:data
```

This uses Hugging Face datasets via Python and writes sampled JSONL files to `data/raw/`.

### Upsert product and review embeddings into Pinecone

```bash
npm run upsert:data
```

This script reads the JSONL files, generates embeddings with Voyage, and writes records into the Pinecone index.

### Generate demo users and store them in PostgreSQL

```bash
npm run process:users
```

This script reads review data, generates persona summaries with the configured LLM provider, and stores demo users in PostgreSQL.

## Expected Local Checks

After startup, the following should work:

### Backend health

```bash
curl http://localhost:5500/health
```

Expected response:

```json
{"status":"ok"}
```

### API health route

```bash
curl http://localhost:5500/api/health
```

### Frontend

Open:

```text
http://localhost:3000
```

If you are running manually with Vite instead of Docker, use the URL printed by `npm run dev` inside `client/`.

## Troubleshooting

### Docker build works but app features fail

This usually means one of the external service variables is missing or invalid:

- `DATABASE_URL`
- `DIRECT_URL`
- `PINECONE_API_KEY`
- `PINECONE_INDEX_NAME`
- `VOYAGE_API_KEY`
- `AI_PROVIDER_API_KEY`

### Frontend loads but recommendations fail

Common causes:

- PostgreSQL has no demo users yet
- Pinecone index is empty
- Voyage API key is invalid
- AI provider key is invalid

### Prisma commands fail

Check that:

- your `.env` file exists in the project root
- `DIRECT_URL` points to a reachable PostgreSQL database
- the database user has permission to create tables

## Reproducibility Notes

For the most reproducible local run:

1. Use Node `22.x`
2. Use `npm ci` instead of `npm install`
3. Keep all required environment variables in the root `.env`
4. Use `docker compose up --build` from the repository root

## Project Scripts

Backend scripts from the repository root:

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:push
npm run prisma:migrate
npm run prisma:reset
npm run download:data
npm run upsert:data
npm run process:users
```

Frontend scripts from `client/`:

```bash
npm run dev
npm run build
npm run preview
```
