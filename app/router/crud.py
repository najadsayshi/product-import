from fastapi import APIRouter, Depends
from app.db import Session, engine, get_session
from app.models import Product
from sqlmodel import select
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

