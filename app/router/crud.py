from fastapi import APIRouter, Depends, HTTPException
from app.db import Session, engine, get_session
from app.models import Product
from sqlmodel import select
from app.schemas import ProductCreate, ProductUpdate
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




@router.patch("/items/{item_id}")
def update_item(item_id: int, product: ProductUpdate, db: Session = Depends(get_session)):

    statement = select(Product).where(Product.id == item_id)
    db_product = db.exec(statement).first()



    try:
        product_data = product.model_dump(exclude_unset=True)
        if not product_data:
            raise HTTPException(status_code=400, detail="No fields provided for update")
        for key, value in product_data.items():
            setattr(db_product, key, value)

        db.add(db_product)
        db.commit()
        db.refresh(db_product)

    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="SKU must be unique")

    except Exception:
        db.rollback()
        raise HTTPException(status_code=400, detail="Invalid data")

    return db_product


@router.delete("/items/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_session)):
    
    statement = select(Product).where(Product.id == item_id)
    db_product = db.exec(statement).first()

    if not db_product:
        raise HTTPException(status_code=404, detail="Item not found")

    
    db.delete(db_product)
    db.commit()
    return {"detail": "Item deleted successfully"}



from sqlmodel import delete

@router.delete("/items")
def delete_all_items(db: Session = Depends(get_session)):
    statement = delete(Product)
    db.exec(statement)
    db.commit()
    return {"message": "All items deleted"}