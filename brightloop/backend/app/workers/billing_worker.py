import time
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import SessionLocal
from app.models.billing import BillingJob, BillingPeriod, Invoice, OutboxEvent
from app.models.subscription import Subscription
from app.services.billing_date_service import calculate_next_billing_date

def process_billing_jobs():
    """Claims and processes billing jobs using FOR UPDATE SKIP LOCKED."""
    db: Session = SessionLocal()
    try:
        # 1. Claim a job safely
        job = db.query(BillingJob).filter(
            BillingJob.status == "Pending"
        ).with_for_update(skip_locked=True).first()

        if not job:
            return # No jobs pending

        job.status = "Claimed"
        job.claimed_until = datetime.now(timezone.utc) + timedelta(minutes=5)
        db.commit() # Commit the claim lease

        # 2. Execute billing transaction
        try:
            sub = db.query(Subscription).filter(Subscription.id == job.subscription_id).with_for_update().first()
            if sub.status != "Active":
                job.status = "Succeeded" # Already handled or cancelled
                db.commit()
                return

            period_end = calculate_next_billing_date(sub.next_billing_at, "monthly", 1) # simplified for example

            # Defense in depth: Check if period already billed
            existing_period = db.query(BillingPeriod).filter_by(
                subscription_id=sub.id, period_start=sub.next_billing_at, period_end=period_end
            ).first()

            if not existing_period:
                # Create Invoice, Period, and Outbox Event transactionally
                invoice = Invoice(tenant_id=sub.tenant_id, subscription_id=sub.id, total_amount=100.00, due_date=period_end, status="Open")
                period = BillingPeriod(subscription_id=sub.id, period_start=sub.next_billing_at, period_end=period_end)
                
                db.add(invoice)
                db.add(period)
                db.flush() # Get invoice ID

                outbox = OutboxEvent(event_type="invoice.created", payload=json.dumps({"invoice_id": invoice.id}))
                db.add(outbox)

                # Advance schedule
                sub.next_billing_at = period_end
                db.add(sub)

            job.status = "Succeeded"
            db.commit() # Commits Invoice, Period, Schedule, Outbox, and Job Success all at once

        except Exception as e:
            db.rollback()
            job.status = "Failed"
            db.add(job)
            db.commit()
    finally:
        db.close()

if __name__ == "__main__":
    while True:
        process_billing_jobs()
        time.sleep(5)