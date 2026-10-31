from pydantic import BaseModel, Field
from typing import Optional

class ProductCreate(BaseModel):
    name: str
    description: Optional[str] = None
    sales_price: float = Field(..., gt=0, description="Must be greater than zero")
    currency: str = "INR"

class ProductResponse(ProductCreate):
    id: str
    is_active: bool

    class Config:
        from_attributes = True

class PlanCreate(BaseModel):
    name: str
    billing_interval_unit: str = Field(..., pattern="^(daily|weekly|monthly|yearly)$")
    interval_count: int = Field(default=1, gt=0)
    price: float = Field(..., gt=0)
    currency: str = "INR"

class PlanResponse(PlanCreate):
    id: str
    is_published: bool

    class Config:
        from_attributes = True