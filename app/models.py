from sqlmodel import SQLModel,Field
from typing import Optional
from datetime import datetime

class Product(SQLModel, table=True):
    id : Optional[int] = Field(default=None,primary_key=True)
    sku : str
    name : str
    description : str
    price : int
    active  : bool = Field(default=True)
    created_at : datetime = Field(default_factory=datetime.utcnow)
    updated_at : datetime = Field(default_factory=datetime.utcnow)

