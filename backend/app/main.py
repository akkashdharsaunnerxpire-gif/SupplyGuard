from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import verify_connection
from app.routes.suppliers import router as suppliers_router
from app.routes.dashboard import router as dashboard_router
from app.routes.products import router as products_router
from app.routes.graph import router as graph_router
import os
app = FastAPI(title="SupplyGuard API")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    verify_connection()


app.include_router(suppliers_router)
app.include_router(dashboard_router)
app.include_router(products_router)
app.include_router(graph_router)


@app.get("/")
def root():
    return {
        "message": "SupplyGuard API is running"
    }