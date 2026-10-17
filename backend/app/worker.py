"""Execution worker: claims queued jobs and runs them in the Judge0 sandbox.   python -m app.worker"""
import logging
import time

from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.database import get_engine
from app.services.executor import Judge0Executor
from app.services.submissions import process_next_job, requeue_stale

log = logging.getLogger("codearena.worker")


def main(poll_seconds: float = 1.0) -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    s = get_settings()
    if s.demo_mode:
        log.warning("****************************************************************")
        log.warning("  DEMO SIMULATION ACTIVE — NOT LIVE JUDGE0 EXECUTION")
        log.warning("****************************************************************")
        from app.services.executor import DemoSimulationExecutor
        executor = DemoSimulationExecutor()
    else:
        executor = Judge0Executor.from_settings()  # exits with a clear error if JUDGE0_URL is missing
    Session = sessionmaker(bind=get_engine(), expire_on_commit=False)
    log.info("worker started (mode: %s)", "DEMO_SIMULATION" if s.demo_mode else "LIVE_JUDGE0")
    last_sweep = 0.0
    while True:
        # A single bad job must never kill the worker: if process_next_job raises (a DB blip, a
        # malformed row, a bug in analysis), we log it, roll back the session, and keep polling.
        # Otherwise one poisoned job would silently stop every student's submissions from running.
        try:
            with Session() as db:
                if time.monotonic() - last_sweep > 60:
                    requeue_stale(db)
                    last_sweep = time.monotonic()
                job_id = process_next_job(db, executor)
        except Exception:  # noqa: BLE001 - the worker must survive anything a single job can throw
            log.exception("worker failed to process a job; continuing")
            time.sleep(poll_seconds)
            continue
        if job_id:
            log.info("processed job %s", job_id)
        else:
            time.sleep(poll_seconds)


if __name__ == "__main__":
    main()
