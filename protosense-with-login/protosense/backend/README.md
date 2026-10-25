# ProtoSense backend (Flask + MySQL)
1. `cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt`
2. MySQL: `CREATE DATABASE protosense CHARACTER SET utf8mb4;` then export DB_USER / DB_PASSWORD (see .env.example). Tables and the 13 sample records are created automatically on first start.
   No MySQL handy? `export DB_BACKEND=sqlite` uses a local file instead.
3. `python app.py` (http://localhost:5000). Frontend: `npm install && npm run dev`; set VITE_API_URL if the API is elsewhere.
Endpoints: GET /api/health, GET|POST /api/experiments, GET /api/experiments/<id>, POST /api/analyze, GET /api/recommendations, PATCH /api/recommendations/<id>.
Matching is the demo algorithm in engine.py, not a trained model. No authentication yet; add it before exposing the API.
