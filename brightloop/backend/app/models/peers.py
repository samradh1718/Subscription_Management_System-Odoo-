from uuid import uuid4
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.models.identity import Base

class PeerProfile(Base):
    __tablename__ = "peer_profiles"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    customer_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    is_opted_in: Mapped[bool] = mapped_column(Boolean, default=False)
    display_anonymously: Mapped[bool] = mapped_column(Boolean, default=True)

class PeerQuestion(Base):
    __tablename__ = "peer_questions"
    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid4()))
    plan_id: Mapped[str] = mapped_column(ForeignKey("plans.id"), nullable=False)
    asker_id: Mapped[str] = mapped_column(String, nullable=False)
    question_text: Mapped[str] = mapped_column(String, nullable=False)
    status: Mapped[str] = mapped_column(String, default="Pending") # Pending, Answered, Moderated