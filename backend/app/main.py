import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from app.api import (
    adaptive, admin, auth, brain, challenges, comprehension, demo, health,
    learning, questions, reports, submissions, sync, tutor,
)
from app.core.config import get_settings
from app.core.errors import register_error_handlers
from app.core.limiter import limiter


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Embedded execution job consumer: ensures local & dev runs execute immediately without requiring a separate CLI process
    stop_event = asyncio.Event()

    async def _job_poller():
        from app.core.config import get_settings
        from app.core.database import get_engine
        from app.services.executor import DemoSimulationExecutor, Judge0Executor
        from app.services.submissions import process_next_job, requeue_stale
        from sqlalchemy.orm import sessionmaker

        s = get_settings()
        if s.demo_mode:
            executor = DemoSimulationExecutor()
        else:
            try:
                executor = Judge0Executor.from_settings()
            except Exception:
                executor = DemoSimulationExecutor()

        Session = sessionmaker(bind=get_engine(), expire_on_commit=False)
        while not stop_event.is_set():
            try:
                with Session() as db:
                    requeue_stale(db)
                    job_id = process_next_job(db, executor)
                if not job_id:
                    await asyncio.sleep(0.5)
            except Exception:
                await asyncio.sleep(1.0)

    task = asyncio.create_task(_job_poller())
    yield
    stop_event.set()
    try:
        await asyncio.wait_for(task, timeout=1.0)
    except Exception:
        pass


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="COGNICODE API",
        version="1.0.0",
        description="AI-powered adaptive programming learning and code comprehension platform.",
        lifespan=lifespan,
    )
    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
        expose_headers=["X-Request-ID", "Server-Timing"],
    )

    @app.middleware("http")
    async def correlation_and_timing_middleware(request: Request, call_next):
        import time
        import uuid
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        t0 = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = round((time.perf_counter() - t0) * 1000, 2)
        response.headers["X-Request-ID"] = request_id
        response.headers["Server-Timing"] = f"total;dur={elapsed_ms}"
        return response

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
              comprehension.router, tutor.router, brain.router, sync.router):
        app.include_router(r, prefix="/api/v1")
    return app


app = create_app()
