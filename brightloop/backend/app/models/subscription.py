from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.identity import Base

class Quotation(Base):
    __tablename__ = "quotations"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True, nullable=False)
    customer_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="Draft") # Draft, Sent, Accepted, Rejected, Expired
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)

class Subscription(Base):
    __tablename__ = "subscriptions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(ForeignKey("tenants.id"), index=True, nullable=False)
    customer_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), nullable=False)
    status: Mapped[str] = mapped_column(String, default="Pending Confirmation") # Active, Paused, Past Due, Cancelled
    next_billing_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    billing_anchor: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    subscription_id: Mapped[str] = mapped_column(ForeignKey("subscriptions.id"), index=True, nullable=False)
    previous_status: Mapped[str] = mapped_column(String, nullable=True)
    new_status: Mapped[str] = mapped_column(String, nullable=False)
    actor_id: Mapped[str] = mapped_column(String, nullable=False)
    reason: Mapped[str] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))