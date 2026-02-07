from pydantic_settings import BaseSettings
from functools import lru_cache
import os
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))


class Settings(BaseSettings):
    DB_URL: str = "sqlite:///./horizon.db"
    TARIFF_AED_PER_KWH: float = 0.38
    EMISSION_FACTOR_KG_PER_KWH: float = 0.45
    DEMO_MODE: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
