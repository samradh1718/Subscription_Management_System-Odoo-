# Import every model module so Base.metadata is complete for Alembic and tests
from app.models import customers, identity  # noqa: F401
from app.models.base import Base  # noqa: F401
