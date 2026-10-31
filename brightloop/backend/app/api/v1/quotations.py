from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from app.core.db import get_db
from app.models.subscription import Quotation, Subscription

router = APIRouter(prefix="/quotations", tags=["quotations"])

@router.post("/{quotation_id}/accept")
def accept_quotation(quotation_id: str, db: Session = Depends(get_db)):
    # Row-level lock prevents concurrent acceptance of the same quote
    quotation = db.query(Quotation).filter(Quotation.id == quotation_id).with_for_update().first()
    
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    
    if quotation.status != "Sent":
        raise HTTPException(status_code=400, detail=f"Cannot accept quotation in status: {quotation.status}")
        
    quotation.status = "Accepted"
    
    now = datetime.now(timezone.utc)
    subscription = Subscription(
        tenant_id=quotation.tenant_id,
        customer_id=quotation.customer_id,
        plan_id=quotation.plan_id,
        status="Pending Confirmation",
        billing_anchor=now,
        next_billing_at=now 
    )
    
    db.add(subscription)
    db.commit()
    
    return {"message": "Quotation accepted", "subscription_id": subscription.id}