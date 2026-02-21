from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.config import settings
from app.database import engine, Base
from app.routers import auth, receipts, pantry, budget, goals, bank, recipes, notifications, plaid
from app.routers import settings as settings_router
from app.routers import ws as ws_router


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

# CORS — allow the web and mobile frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_ORIGIN, settings.MOBILE_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "app": settings.APP_NAME}
