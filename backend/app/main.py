from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import settings
from app.database import engine, Base
from app.routers import auth, receipts, pantry, budget, goals, bank, recipes, notifications, plaid, insights
from app.routers import settings as settings_router
from app.routers import ws as ws_router
from app.routers import chat as chat_router

# ── Rate limiter ──────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])


async def _run_expiry_check():
    """Scheduled job: send push alerts for items expiring in the next 3 days."""
    from app.database import AsyncSessionLocal
    from app.services.notification_service import send_expiry_notifications
    async with AsyncSessionLocal() as db:
        await send_expiry_notifications(db, days_ahead=3)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create DB tables (dev mode only — use Alembic in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # Create upload dir if using local storage
    os.makedirs(settings.LOCAL_UPLOAD_DIR, exist_ok=True)

    # Phase 2: Schedule daily expiry notification at 8 AM
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        scheduler = AsyncIOScheduler()
        scheduler.add_job(_run_expiry_check, "cron", hour=8, minute=0, id="expiry_check")
        scheduler.start()
        yield
        scheduler.shutdown(wait=False)
    except ImportError:
        yield  # APScheduler not installed — skip scheduling

    # Shutdown: close DB connections
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="Household inventory + personal finance tracker API",
    version="1.0.0",
    lifespan=lifespan,
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — allow the web and mobile frontends
# In development, also allow any localhost port (e.g. Next.js dev server on :3000,
# Expo on :8081, Storybook on :6006, etc.).  In production, lock this to your
# actual domain(s) via FRONTEND_ORIGIN env var.
_allowed_origins = [settings.FRONTEND_ORIGIN, settings.MOBILE_ORIGIN]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    # Allow any localhost origin in dev so that a 500 doesn't appear as CORS
    allow_origin_regex=r"http://localhost(:\d+)?$" if settings.DEBUG else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Global exception handler ─────────────────────────────────────────────────
# Starlette's ExceptionMiddleware catches unhandled 500s BEFORE CORSMiddleware
# can add headers, so the browser sees a CORS error instead of the real 500.
# This handler re-attaches CORS headers to every error response.
@app.exception_handler(Exception)
async def _unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    import traceback, logging
    logging.getLogger(__name__).error(
        "Unhandled exception on %s %s: %s",
        request.method, request.url.path,
        exc, exc_info=True,
    )
    origin = request.headers.get("origin", "")
    headers = {}
    if origin:
        # Mirror the origin back so the browser can read the error body
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": f"{type(exc).__name__}: {exc}"},
        headers=headers,
    )

# Serve local receipt images during development
if settings.USE_LOCAL_STORAGE:
    os.makedirs(settings.LOCAL_UPLOAD_DIR, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=settings.LOCAL_UPLOAD_DIR), name="uploads")

# Route registration
app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(receipts.router,      prefix="/api/receipts",      tags=["Receipts"])
app.include_router(pantry.router,        prefix="/api/pantry",        tags=["Pantry"])
app.include_router(budget.router,        prefix="/api/budget",        tags=["Budget"])
app.include_router(goals.router,         prefix="/api/goals",         tags=["Goals"])
app.include_router(bank.router,          prefix="/api/bank",          tags=["Bank"])
app.include_router(recipes.router,       prefix="/api/recipes",       tags=["Recipes"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(plaid.router,         prefix="/api/plaid",         tags=["Plaid"])
app.include_router(settings_router.router, prefix="/api/settings",     tags=["Settings"])
app.include_router(ws_router.router,     prefix="/api/ws",            tags=["WebSocket"])
app.include_router(insights.router,      prefix="/api/insights",      tags=["Insights"])
app.include_router(chat_router.router,   prefix="/api/chat",          tags=["Chat"])


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": settings.APP_NAME}


@app.get("/api/health", tags=["Health"])
async def health_check():
    """Readiness probe — confirms app + DB are reachable."""
    from app.database import AsyncSessionLocal
    from sqlalchemy import text
    try:
        async with AsyncSessionLocal() as session:
            await session.execute(text("SELECT 1"))
        return {"status": "healthy", "db": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "db": str(e)},
        )
