# BorrowLab — Production Deployment Guide

This guide covers deploying **BorrowLab** to production environments, including cloud hosting providers (Render, Railway, Fly.io, DigitalOcean, VPS) and managed PostgreSQL platforms (Neon, Supabase, AWS RDS).

---

## 1. Production Architecture Options

BorrowLab supports two deployment models:

### Option A: Unified Full-Stack (Recommended for Single Server / Container)
The Express backend builds the React client and serves the static production SPA bundle from `client/dist`.
- **Pros**: Single URL, single process, zero CORS issues, simplest configuration.
- **Hosts**: Render, Railway, Fly.io, VPS (Ubuntu / Debian), Docker.

### Option B: Decoupled Deployment
The React client is hosted on a static edge host (Vercel, Netlify, Cloudflare Pages), and the Express backend is hosted on a container/node platform (Render, Railway, Fly.io).
- **Pros**: Global edge CDN caching for static frontend assets.
- **Configuration**: Requires setting `VITE_API_BASE` on the frontend and `ALLOWED_ORIGINS` / `CLIENT_URL` on the backend for CORS.

---

## 2. Environment Variables Reference

### Backend (`server/.env`)

| Variable | Required | Default | Description |
|---|---|---|---|
| `NODE_ENV` | Yes | `production` | Set to `production` to enforce strict security and SSL |
| `PORT` | No | `5000` | Port Express listens on (cloud providers inject this automatically) |
| `DATABASE_URL` | Recommended | — | Full PostgreSQL connection string (`postgresql://user:pass@host:5432/dbname?sslmode=require`) |
| `PGHOST` | Conditional | `localhost` | Database host (if not using `DATABASE_URL`) |
| `PGPORT` | Conditional | `5432` | Database port |
| `PGUSER` | Conditional | `postgres` | Database user |
| `PGPASSWORD` | Conditional | — | Database password |
| `PGDATABASE` | Conditional | `borrowlab` | Database name |
| `PGSSL` | No | `false` | Set to `true` if your managed Postgres requires SSL |
| `JWT_SECRET` | **Yes** | — | High-entropy random secret (min 32 characters, e.g. `openssl rand -base64 32`) |
| `CLIENT_URL` | Conditional | — | Production URL of frontend (e.g., `https://borrowlab.app`) for CORS |
| `ALLOWED_ORIGINS`| Conditional | — | Comma-separated list of allowed domains for CORS |

### Frontend (`client/.env.production` or Host Dashboard)

| Variable | Required | Default | Description |
|---|---|---|---|
| `VITE_API_BASE` | No | `/api` | Base path for API requests. Leave as `/api` for unified deployments or set to `https://api.yourdomain.com/api` for decoupled deployments |

---

## 3. Database Provisioning in Production

When deploying to a new PostgreSQL instance (e.g. Neon, Supabase, Render Postgres):

1. Set your `DATABASE_URL` environment variable:
   ```bash
   export DATABASE_URL="postgresql://user:password@host:5432/borrowlab?sslmode=require"
   ```

2. Run the platform-agnostic migration script from `server/`:
   ```bash
   cd server
   npm run db:setup
   ```
   This automatically executes:
   - `database/01_schema.sql` (Creates public schema, ENUMs, and 29 relational tables)
   - `database/02_views.sql` (Creates `listing_availability` and `user_trust_summary` views)
   - `database/03_indexes.sql` (Creates B-tree composite performance indexes)
   - `database/04_seed.sql` (Seeds initial university directory, admin, and catalog data)

---

## 4. Deploying Option A: Unified Service (Render / Railway / VPS)

### Build Commands:
```bash
# Install dependencies and build client SPA
cd client && npm install && npm run build

# Install dependencies and compile server TypeScript
cd ../server && npm install && npm run build
```

### Start Command:
```bash
cd server && npm start
```
*When `client/dist` exists, Express automatically serves the compiled SPA and routes all `/api/*` and SSE `/api/events` endpoints.*

---

## 5. Deploying Option B: Decoupled (Vercel + Render)

### Backend (Render / Railway):
- **Root Directory**: `server`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`
- **Environment Variables**:
  - `DATABASE_URL`: Cloud PostgreSQL connection string
  - `JWT_SECRET`: Random 32+ character secret
  - `CLIENT_URL`: `https://borrowlab.vercel.app`
  - `NODE_ENV`: `production`

### Frontend (Vercel / Netlify):
- **Root Directory**: `client`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variables**:
  - `VITE_API_BASE`: `https://your-backend.onrender.com/api`

---

## 6. Pre-Flight Deployment Checklist

- [ ] **Database Seeded**: Run `npm run db:setup` against production database.
- [ ] **JWT Secret**: Generated a cryptographically secure `JWT_SECRET` (`openssl rand -base64 32`).
- [ ] **CORS Configuration**: Configured `CLIENT_URL` / `ALLOWED_ORIGINS` to match frontend domain.
- [ ] **Uploads Directory**: If storing uploaded hardware condition photos locally, ensure the container volume or disk is persistent, or mount an S3/storage bucket.
- [ ] **Health Endpoint**: Verify `GET /api/health` returns `{"status":"healthy","database":"connected"}`.
