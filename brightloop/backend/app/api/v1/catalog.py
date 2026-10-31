from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.db import get_db
from app.models.catalog import Product, Plan
from app.schemas.catalog import ProductCreate, ProductResponse, PlanCreate, PlanResponse

router = APIRouter(prefix="/catalog", tags=["catalog"])

# Mock dependency representing session extraction
def get_current_tenant() -> str:
    # In production, this reads the session_id cookie and looks up the user's tenant_id
    # We will hardcode this to match our seed script for now
    return "brightloop_software_tenant_id" 

@router.post("/products", response_model=ProductResponse)
def create_product(product_in: ProductCreate, db: Session = Depends(get_db), tenant_id: str = Depends(get_current_tenant)):
    product = Product(**product_in.model_dump(), tenant_id=tenant_id)
    db.add(product)
    db.commit()
    db.refresh(product)
    return product

@router.get("/products", response_model=list[ProductResponse])
def list_products(db: Session = Depends(get_db), tenant_id: str = Depends(get_current_tenant)):
    return db.query(Product).filter(Product.tenant_id == tenant_id).all()

@router.post("/plans", response_model=PlanResponse)
def create_plan(plan_in: PlanCreate, db: Session = Depends(get_db), tenant_id: str = Depends(get_current_tenant)):
    plan = Plan(**plan_in.model_dump(), tenant_id=tenant_id, is_published=True)
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan

@router.get("/plans", response_model=list[PlanResponse])
def list_plans(db: Session = Depends(get_db), tenant_id: str = Depends(get_current_tenant)):
    return db.query(Plan).filter(Plan.tenant_id == tenant_id).all()