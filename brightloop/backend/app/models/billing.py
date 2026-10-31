from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import String, Numeric, DateTime, ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.models.identity import Base

class BillingPeriod(Base):
    __tablename__ = "billing_periods"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    subscription_id: Mapped[str] = mapped_column(ForeignKey("subscriptions.id"), nullable=False)
    period_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    period_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    
    # Critical constraint: Prevents duplicate invoices at the database level
    __table_args__ = (UniqueConstraint('subscription_id', 'period_start', 'period_end', name='uix_subscription_period'),)

class BillingJob(Base):
    __tablename__ = "billing_jobs"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    subscription_id: Mapped[str] = mapped_column(ForeignKey("subscriptions.id"), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String, default="Pending") # Pending, Claimed, Succeeded, Failed
    claimed_until: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)

class Invoice(Base):
    __tablename__ = "invoices"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    tenant_id: Mapped[str] = mapped_column(String, index=True, nullable=False)
    subscription_id: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="Draft") # Draft, Open, Paid, Void
    total_amount: Mapped[float] = mapped_column(Numeric(14, 2), nullable=False)
    due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

class OutboxEvent(Base):
    __tablename__ = "outbox_events"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    event_type: Mapped[str] = mapped_column(String, nullable=False) # e.g., "invoice.created"
    payload: Mapped[str] = mapped_column(String, nullable=False) # JSON string
    status: Mapped[str] = mapped_column(String, default="Pending")