from pydantic import BaseModel


class ProductCreate(BaseModel):
    name: str
    sku: str
    description: str
    price: float