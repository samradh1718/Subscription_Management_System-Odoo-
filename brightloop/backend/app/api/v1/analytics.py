from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.services.analytics_service import get_mrr_and_receivables
from app.api.v1.catalog import get_current_tenant # Reusing the auth dependency

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/revenue")
def get_revenue_metrics(db: Session = Depends(get_db), tenant_id: str = Depends(get_current_tenant)):
    """Returns real-time MRR and outstanding receivables directly from the database."""
    metrics = get_mrr_and_receivables(db, tenant_id)
    
    # Calculate ARR directly from MRR as per the specification
    metrics["arr"] = metrics["mrr"] * 12
    
    return metrics