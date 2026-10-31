from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models.subscription import Subscription
from app.models.billing import Invoice

def get_mrr_and_receivables(db: Session, tenant_id: str) -> dict:
    """Calculates active MRR and outstanding receivables deterministically."""
    # MRR: Sum of monthly active subscription prices
    mrr = db.query(func.sum(Subscription.price)).filter(
        Subscription.tenant_id == tenant_id,
        Subscription.status == "Active",
        Subscription.billing_interval_unit == "monthly"
    ).scalar() or 0.0

    # Receivables: Sum of open/overdue invoices
    receivables = db.query(func.sum(Invoice.total_amount)).filter(
        Invoice.tenant_id == tenant_id,
        Invoice.status.in_(["Open", "Partially Paid"])
    ).scalar() or 0.0

    return {"mrr": float(mrr), "outstanding_receivables": float(receivables)}