# Production Deployment Guide

## Environment Variables Setup

### Backend (Render)
Set these environment variables in Render dashboard or `backend/.env`:

```
PORT=8080
NODE_ENV=production
JWT_SECRET=YOUR_SECURE_SECRET_HERE
MONGODB_URI=mongodb+srv://joaope14dro_db_user:PASSWORD@cluster0.dtzi96y.mongodb.net/toolora?appName=Cluster0
```

### Frontend (Render)
Set in Render dashboard or `frontend/.env.production`:

```
VITE_API_URL=https://toolora-backend.onrender.com/api
```

## MongoDB Atlas Whitelist
Add Render's outbound IP ranges to Atlas Network Access:
- `74.220.51.0/24`
- `74.220.59.0/24`

## Build Commands

### Local Development
```bash
# Backend
JWT_SECRET=dev_secret npm run dev --prefix backend

# Frontend
npm run dev --prefix frontend
```

### Production Build
```bash
# Backend
npm run build --prefix backend

# Frontend
npm run build --prefix frontend
```

## CORS Configuration

The backend CORS is configured to accept:
- `http://localhost:5173` (dev)
- `http://localhost:5174` (dev)
- `http://localhost:5175` (dev)
- `https://toolora-7a2w.onrender.com` (frontend Render)
- `https://toolora-backend.onrender.com` (backend Render)

Add more origins in `backend/app.ts` if needed.

## Deployment Checklist

- [ ] MongoDB Atlas connection string configured
- [ ] JWT_SECRET set in environment variables (use `openssl rand -hex 16` to generate)
- [ ] Render outbound IPs whitelisted in Atlas
- [ ] Frontend `VITE_API_URL` points to backend URL
- [ ] CORS origins updated for your domain
- [ ] Build succeeds locally: `npm run build --prefix frontend && npm run build --prefix backend`
