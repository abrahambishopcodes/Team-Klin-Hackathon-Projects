# Docker and Railway Deployment

This project can run as one Docker container. The backend serves the API at `/api` and serves the built frontend from `client/dist`.

## Required Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

Fill in:

```env
GROQ_API_KEY=your_groq_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=your_pinecone_index
PORT=3000
```

## Run Locally With Docker Compose

```bash
docker compose up --build
```

Open:

```text
http://localhost:3000
```

The health check endpoint is:

```text
http://localhost:3000/health
```

Stop the container:

```bash
docker compose down
```

## Run Locally With Docker Only

Build the image:

```bash
docker build -t review-simulator-agent .
```

Run the container:

```bash
docker run --env-file .env -p 3000:3000 review-simulator-agent
```

Open `http://localhost:3000`.

## Deploy on Railway

1. Push this repository to GitHub.
2. Create a new Railway project.
3. Choose **Deploy from GitHub repo** and select this repository.
4. Railway should detect the `Dockerfile` automatically.
5. Add these Railway variables:

```env
GROQ_API_KEY=your_groq_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX=your_pinecone_index
NODE_ENV=production
```

Do not set `PORT` manually on Railway unless you have a specific reason. Railway injects `PORT`, and the app already reads it.

6. Deploy the service.
7. After deployment, open the generated Railway domain.

## Notes

- The frontend uses `/api` by default, so it works in the Docker container and on Railway without hardcoding a domain.
- For local frontend-only development with Vite, set `VITE_API_BASE_URL=http://localhost:3000/api` if the frontend runs separately from the backend.
