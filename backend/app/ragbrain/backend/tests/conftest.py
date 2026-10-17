"""
Pytest configuration and shared fixtures.
Sets APP_ENV=test and INFERENCE_PROVIDER=mock before any import.
"""
import os

# Must be set before app imports to ensure test settings load correctly
os.environ.setdefault("APP_ENV", "test")
os.environ.setdefault("INFERENCE_PROVIDER", "mock")
os.environ.setdefault("DATABASE_URL", "postgresql+asyncpg://test:test@localhost:5432/test_db")
os.environ.setdefault("QDRANT_URL", "http://localhost:6333")
os.environ.setdefault("APP_SECRET_KEY", "test-secret-key-min-32-chars-long-here")
os.environ.setdefault("JWT_SECRET_KEY", "test-jwt-secret-key-min-32-chars-here")

import pytest


@pytest.fixture(autouse=True)
def reset_settings_cache():
    """Clear the settings cache between tests to prevent state leakage."""
    from app.core.config import get_settings
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()
