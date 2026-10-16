from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from app.api import (
    adaptive, admin, auth, challenges, comprehension, demo, health,
    learning, questions, reports, submissions, sync, tutor,
)
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.limiter import limiter


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="COGNICODE API",
        version="1.0.0",
        description="AI-powered adaptive programming learning and code comprehension platform.",
    )
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type"],
    )

    @app.middleware("http")
    async def security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response

    register_error_handlers(app)
    for r in (health.router, auth.router, challenges.router, submissions.router, admin.router,
              reports.router, questions.router, demo.router, learning.router, adaptive.router,
              comprehension.router, tutor.router, sync.router):
        app.include_router(r, prefix="/api/v1")
    return app


app = create_app()
