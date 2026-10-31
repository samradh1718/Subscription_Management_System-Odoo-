import uuid

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Timestamps, UUIDPk


class Customer(UUIDPk, Timestamps, Base):
    """Business-side customer profile; separate from the login account (user_id optional)."""

    __tablename__ = "customers"
    __table_args__ = (
        Index("ix_customers_tenant_email", "tenant_id", "email"),
        Index("ix_customers_tenant_name", "tenant_id", "display_name"),
    )

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"))
    user_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), unique=True)
    display_name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(320))
    phone: Mapped[str | None] = mapped_column(String(40))
    company: Mapped[str | None] = mapped_column(String(200))
    industry: Mapped[str | None] = mapped_column(String(100))
    business_size: Mapped[str | None] = mapped_column(String(30))
    is_demo: Mapped[bool] = mapped_column(Boolean, server_default="false")

    addresses: Mapped[list["CustomerAddress"]] = relationship(
        back_populates="customer", lazy="selectin", cascade="all, delete-orphan"
    )

    @property
    def has_login(self) -> bool:
        return self.user_id is not None


class CustomerAddress(UUIDPk, Timestamps, Base):
    __tablename__ = "customer_addresses"
    __table_args__ = (CheckConstraint("kind IN ('billing', 'shipping')", name="kind_valid"),)

    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"))
    customer_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("customers.id", ondelete="CASCADE"), index=True
    )
    kind: Mapped[str] = mapped_column(String(10), server_default="billing")
    line1: Mapped[str] = mapped_column(String(200))
    line2: Mapped[str | None] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(100))
    state: Mapped[str | None] = mapped_column(String(100))
    postal_code: Mapped[str | None] = mapped_column(String(20))
    country: Mapped[str] = mapped_column(String(2), server_default="IN")
    is_default: Mapped[bool] = mapped_column(Boolean, server_default="false")

    customer: Mapped[Customer] = relationship(back_populates="addresses")
