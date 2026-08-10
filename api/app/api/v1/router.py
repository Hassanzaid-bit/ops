from fastapi import APIRouter

from app.api.v1.endpoints import auth, health, jobs, records, sites

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(sites.router)
api_router.include_router(jobs.router)
api_router.include_router(records.router)
