.PHONY: backend frontend simulator all demo install-backend install-frontend seed test

# ─── Install ────────────────────────────────────────────────
install-backend:
	pip install -r backend/requirements.txt

install-frontend:
	cd frontend && npm install

install: install-backend install-frontend

# ─── Run ────────────────────────────────────────────────────
backend:
	uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000

frontend:
	cd frontend && npm run dev

simulator:
	python -m scripts.simulate_stream --scenario normal --interval 2

seed:
	python -m scripts.seed

# ─── Test ───────────────────────────────────────────────────
test:
	python -m pytest backend/tests/ -v

# ─── Combo ──────────────────────────────────────────────────
all:
	@echo "Starting backend, simulator, and frontend..."
	@make backend &
	@sleep 3 && make simulator &
	@make frontend

demo:
	@echo "Horizon Demo Mode"
	@make seed
	@make backend &
	@sleep 3 && python -m scripts.simulate_stream --scenario peak --interval 2 &
	@sleep 1 && make frontend
