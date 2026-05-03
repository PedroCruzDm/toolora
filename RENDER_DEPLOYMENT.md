# Deployment Guide - Render + MongoDB Atlas

## Overview
- **Backend**: Node.js/Express no Render (`https://toolora-backend.onrender.com`)
- **Frontend**: React/Vite no Render (`https://seu-frontend.onrender.com`)
- **Database**: MongoDB Atlas (cloud cluster)
- **Ad Network**: Google AdSense

---

## Backend Setup on Render

### 1. Environment Variables

No painel do Render, defina as seguintes variáveis no seu serviço backend:

| Variable | Value | Notes |
|----------|-------|-------|
| `MONGODB_URI` | `mongodb+srv://joaope14dro_db_user:<db_password>@tooloradb.wuvipre.mongodb.net/toolora` | Replace `<db_password>` with actual password |
| `JWT_SECRET` | `b34115f2c257614960e22ed13cfa1b19` | Or generate a new one: `openssl rand -base64 32` |
| `NODE_ENV` | `production` | Enables production optimizations |

**⚠️ Note**: `PORT` is auto-detected by Render (usually 10000+). Do NOT set it manually.

### 2. Build & Start Commands

**Build Command**:
```bash
cd backend && npm install && npm run build
```

**Start Command**:
```bash
cd backend && npm start
```

(Or if your `package.json` has `npm run dev`, use `npm run dev` but ensure it doesn't exit prematurely)

### 3. Root Directory

Render should deploy from the **repository root** (where `docker-compose.yml` exists), not from `backend/` subdirectory.

Configure in Render:
- **Root Directory**: `.` (or leave empty)
- **Build Command**: `cd backend && npm install && npm start` (adjusted path)

Alternatively, if Render deploys from root:
- **Build Command**: `npm install` (in backend dir via `cd`)
- **Start Command**: `node backend/app.ts` or via `npm run start` in backend

---

## Frontend Setup on Render (Static Site or Web Service)

### Option A: Render Static Site (Recommended for React SPA)

1. **Create new Static Site on Render**
2. **Connect** your GitHub repo
3. **Configure**:
   - **Build Command**: `npm run build --prefix frontend`
   - **Publish directory**: `frontend/dist`
   - **Environment**: (none needed if not hardcoded)

4. **Automatic Deployment**: Each push to main/branch triggers rebuild

### Option B: Render Web Service (if you need server-side logic)

1. **Create new Web Service on Render**
2. **Build Command**: `npm run build --prefix frontend`
3. **Start Command**: `npm run preview --prefix frontend` (serves dist locally)
4. **Port**: 5173 or auto-detect

---

## CORS Configuration

### Backend CORS Settings

Update `backend/server.ts` to allow your frontend origin:

```typescript
app.use(cors({
  origin: [
    'http://localhost:5173',           // Dev local
    'https://seu-frontend.onrender.com' // Production frontend URL
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

Replace `seu-frontend.onrender.com` with your actual Render frontend URL.

### Frontend API Configuration

`frontend/src/services/api.ts` already points to:
```typescript
baseURL: 'https://toolora-backend.onrender.com'
```

✅ This is correct for production.

---

## MongoDB Atlas Connection

### Prerequisites

1. **Create MongoDB Atlas Account** (free tier: 512 MB)
   - https://www.mongodb.com/cloud/atlas

2. **Create a Cluster**
   - Region: Choose closest to Render (usually US-East or EU)
   - Free tier M0 is sufficient for development

3. **Create Database User**
   - Username: `joaope14dro_db_user`
   - Password: Your secure password

4. **Allow Render IP Range**
   - In Atlas → Network Access → IP Whitelist
   - Add: `74.220.51.0/24` and `74.220.59.0/24` (Render's shared IP ranges)
   - Or allow `0.0.0.0/0` (allow all) for easier testing, then restrict later

5. **Get Connection String**
   - Copy from Atlas: `mongodb+srv://user:pass@cluster.mongodb.net/`
   - Use as `MONGODB_URI` in Render env vars

---

## Testing Deployment

### 1. Health Check Backend

```bash
curl -X GET https://toolora-backend.onrender.com/api/tools
```

Expected response: `200 OK` with array of tools (empty if no data inserted)

### 2. Check Frontend Loads

```bash
curl -I https://seu-frontend.onrender.com
```

Expected: `200 OK` with HTML content

### 3. Test API Integration

Open frontend in browser → F12 Console → Network tab
- Make a request (e.g., login or fetch tools)
- Verify request goes to `https://toolora-backend.onrender.com/api/*`
- Check response status (200, 401, 403, etc.)

---

## Troubleshooting

### Backend Won't Start

**Check logs**:
1. Render dashboard → Service logs
2. Look for `MONGODB_URI` or `JWT_SECRET` errors
3. Verify MongoDB connection string includes `?authSource=admin` if needed

### CORS Errors in Frontend

**Check**:
1. Frontend can reach backend URL (open `https://toolora-backend.onrender.com/api/tools` in browser)
2. Backend CORS includes frontend origin (not localhost)
3. Browser cache cleared (Cmd+Shift+R on Mac, Ctrl+Shift+R on Linux/Windows)

### MongoDB Connection Timeout

**Check**:
1. IP whitelist in Atlas includes Render IPs (or 0.0.0.0/0)
2. MongoDB password is URL-encoded (if contains special chars, use `%` encoded version)
3. Cluster is running (check Atlas dashboard)

---

## Production Checklist

- [ ] `MONGODB_URI` set in Render env vars (with correct password)
- [ ] `JWT_SECRET` set (or generated new secure one)
- [ ] `NODE_ENV=production` set (optional but recommended)
- [ ] Backend CORS includes frontend URL
- [ ] Frontend API URL points to backend Render URL
- [ ] MongoDB Atlas IPs whitelisted for Render
- [ ] Admin account created in MongoDB (or seed script)
- [ ] AdSense account linked (check `index.html` )
- [ ] Domain configured (optional: add custom domain to Render)
- [ ] SSL/TLS: auto-enabled by Render (free cert)

---

## Monitoring

### Render Analytics

- Logs → View build & runtime logs
- Metrics → CPU, memory, request count
- Errors → HTTP error rates

### MongoDB Atlas Monitoring

- Charts → Query performance, connection count
- Alerts → Set up alerts for high CPU, connection saturation

---

## Useful Commands (Local Testing Before Deploy)

```bash
# Test backend locally with production-like env
JWT_SECRET=b34115f2c257614960e22ed13cfa1b19 \
MONGODB_URI=mongodb+srv://user:pass@cluster.net/toolora \
npm run dev --prefix backend

# Build and serve frontend as production
npm run build --prefix frontend
npx serve frontend/dist

# Check if backend is reachable
curl https://toolora-backend.onrender.com/api/tools
```

---

## Notes

- Render free tier may sleep after 15 min of inactivity; upgrade to "Pay As You Go" for always-on.
- MongoDB Atlas free tier has 512 MB storage limit; monitor usage in Settings.
- Rate limiting (protection) is active on management endpoints — adjust in `rateLimitMiddleware.ts` if needed.
- Audit logs are stored in MongoDB — check `/api/management/logs` (owner only) to review actions.

---

*Last Updated: 2026-05-01*
