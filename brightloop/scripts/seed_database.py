import sys
import os
from datetime import datetime, timezone, timedelta

# Ensure the backend module is in the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '../backend'))

from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.identity import Tenant, User
from app.models.catalog import Product, Plan
from app.models.subscription import Subscription
from app.models.billing import BillingJob
from app.core.security import get_password_hash

def seed_e2e_data():
    db: Session = SessionLocal()
    
    try:
        # 1. Establish Fixed Tenant for API Mock Auth
        tenant_id = "brightloop_software_tenant_id"
        tenant = db.query(Tenant).filter(Tenant.id == tenant_id).first()
        if not tenant:
            tenant = Tenant(id=tenant_id, name="Brightloop Software")
            db.add(tenant)
            db.flush()

        # 2. Add Admin User
        if not db.query(User).filter(User.email == "admin@brightloop.local").first():
            admin = User(
                tenant_id=tenant.id, 
                email="admin@brightloop.local", 
                hashed_password=get_password_hash("AdminPass123!"), 
                role="admin"
            )
            db.add(admin)

        # 3. Create Catalog Items
        product = Product(tenant_id=tenant.id, name="CRM Suite", sales_price=1500.00)
        db.add(product)
        db.flush()
        
        plan = Plan(tenant_id=tenant.id, name="Monthly Pro", billing_interval_unit="monthly", price=1500.00, is_published=True)
        db.add(plan)
        db.flush()

        # 4. Stage an Active Subscription Due TODAY
        customer_id = "cust_demo_001"
        now = datetime.now(timezone.utc)
        
        sub = Subscription(
            tenant_id=tenant.id,
            customer_id=customer_id,
            plan_id=plan.id,
            status="Active",
            billing_anchor=now - timedelta(days=30), # Started 30 days ago
            next_billing_at=now # Due right now
        )
        db.add(sub)
        db.flush()

        # 5. Enqueue Billing Job for the Worker
        job = BillingJob(
            subscription_id=sub.id,
            idempotency_key=f"bill_{sub.id}_{now.strftime('%Y%m')}",
            status="Pending"
        )
        db.add(job)

        db.commit()
        print("End-to-End demo data seeded successfully. Worker will now process the pending job.")
    
    except Exception as e:
        db.rollback()
        print(f"Failed to seed data: {str(e)}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_e2e_data()