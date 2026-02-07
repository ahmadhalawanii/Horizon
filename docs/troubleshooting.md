# Troubleshooting

## Common Issues

### "No home found. Run seed first."
**Problem**: Database is empty.
**Fix**:
```bash
make seed
```

### Backend won't start / port 8000 in use
**Problem**: Another process is using port 8000.
**Fix**:
```bash
# Find and kill the process
lsof -ti:8000 | xargs kill -9
# Then restart
make backend
```

### Frontend shows "Loading..." forever
**Problem**: Backend isn't running or CORS issue.
**Fix**:
1. Ensure backend is running: `curl http://localhost:8000/health`
2. Check `frontend/.env` has `VITE_API_BASE_URL=http://localhost:8000`
3. Restart frontend: `make frontend`

### WebSocket shows "Offline" (gray dot)
**Problem**: WebSocket connection failed.
**Fix**:
1. Ensure backend is running
2. Check `frontend/.env` has `VITE_WS_URL=ws://localhost:8000/ws/live`
3. Check browser console for WS errors
4. The WS auto-reconnects with exponential backoff — wait a few seconds

### Simulator not streaming data
**Problem**: Simulator can't reach backend.
**Fix**:
1. Ensure backend is running first
2. Ensure DB is seeded: `make seed`
3. Run manually: `python -m scripts.simulate_stream --scenario normal --interval 2`

### "Module not found" errors
**Problem**: Dependencies not installed.
**Fix**:
```bash
make install
```

### SQLite database locked
**Problem**: Multiple processes writing to SQLite.
**Fix**:
1. Stop all processes
2. Delete `backend/horizon.db`
3. Re-seed: `make seed`

### Charts not showing data
**Problem**: No telemetry data yet.
**Fix**:
1. Run the simulator for a few seconds: `make simulator`
2. Or run `make demo` which starts everything together

### Frontend build errors
**Problem**: TypeScript or dependency issues.
**Fix**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run typecheck
```

## Environment Variables

Make sure both `.env` files exist:
```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

## Need Help?

1. Check backend logs in the terminal running `make backend`
2. Check browser DevTools console for frontend errors
3. Visit `http://localhost:8000/docs` for interactive API docs (Swagger)
