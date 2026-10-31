from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1 import auth, quotations
from app.api.v1 import catalog, analytics

app = FastAPI(
    title="Brightloop Subscription OS",
    description="Backend API for subscription lifecycle, billing, and analytics.",
    version="1.0.0"
)

# CORS Configuration for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Domain Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(quotations.router, prefix="/api/v1")
app.include_router(catalog.router, prefix="/api/v1")
app.include_router(analytics.router, prefix="/api/v1")

@app.get("/health")
def health_check():
    """Validates API uptime before worker or frontend startup."""
    return {"status": "healthy"}