from typing import TypeVar, Generic, Type, Optional
from sqlalchemy.orm import Session

ModelType = TypeVar("ModelType")

class TenantScopedRepository(Generic[ModelType]):
    def __init__(self, model: Type[ModelType], session: Session, tenant_id: str):
        self.model = model
        self.session = session
        self.tenant_id = tenant_id

    def _base_query(self):
        """Enforces tenant isolation on every query."""
        return self.session.query(self.model).filter(self.model.tenant_id == self.tenant_id)

    def get_by_id(self, record_id: str) -> Optional[ModelType]:
        return self._base_query().filter(self.model.id == record_id).first()

    def get_all(self) -> list[ModelType]:
        return self._base_query().all()