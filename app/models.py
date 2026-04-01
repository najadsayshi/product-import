from sqlmodel import SQLModel,Field
from typing import Optional
from datetime import datetime

class Product(SQLModel, table=True):
    id : Optional[int] = Field(default=None,primary_key=True)
    sku : str = Field(index=True,unique=True)
    name : str
    description : str
    price : float
    active  : bool = Field(default=True)
    created_at : datetime = Field(default_factory=datetime.utcnow)
    updated_at : datetime = Field(default_factory=datetime.utcnow)

