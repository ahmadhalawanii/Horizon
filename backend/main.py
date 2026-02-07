from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.database import engine, Base
from backend.routes import router
# Import models so they register with Base
import backend.models  # noqa: F401

app = FastAPI(
    title="Horizon – Home Energy Digital Twin",
    version="0.1.0",
    description="AI-powered home energy optimization for UAE villas",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
