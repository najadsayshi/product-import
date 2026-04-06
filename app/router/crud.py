from fastapi import APIRouter, Depends
from app.db import Session, engine, get_session
from app.models import Product
from sqlmodel import select
from app.schemas import ProductCreate
from sqlalchemy.exc import IntegrityError
router = APIRouter()

@router.get("/items")
def get_items(db: Session = Depends(get_session),
              page: int = 1,
              page_size: int = 50):
    
    page_size = min(page_size, 100)  # max 100 items per page
    offset = (page - 1) * page_size

    statement = select(Product).offset(offset).limit(page_size)
    results = db.exec(statement).all()
    return results




@router.post("/items")
def create_item(product : ProductCreate, db: Session = Depends(get_session)):

    try:
        db_product = Product(
            name = product.name,
            sku = product.sku,
            description= product.description,
            price = product.price 
        )
        db.add(db_product)
        db.commit()
        db.refresh(db_product)
        return db_product
    
    except IntegrityError:
        db.rollback()
        return {"error": "SKU must be unique."}
