import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base, SessionLocal
from backend.routes import router
import backend.models  # noqa: F401

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("horizon")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create tables and initialize the digital twin model."""
    Base.metadata.create_all(bind=engine)

    # Initialize the digital twin from DB state
    from backend.twin_engine import initialize_twin
    db = SessionLocal()
    try:
        twin = initialize_twin(db)
        if twin:
            logger.info(f"Digital twin is LIVE — model stepping with physics engine")
        else:
            logger.warning("Twin not initialized — run `make seed` first")
    finally:
        db.close()

    yield  # app runs

    logger.info("Horizon shutting down")


app = FastAPI(
    title="Horizon – Home Energy Digital Twin",
    version="0.2.0",
    description=(
        "AI-powered home energy optimization with a real physics-based "
        "digital twin: thermal dynamics, device models, continuous state."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
