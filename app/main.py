from fastapi import FastAPI, UploadFile,File,Depends
from typing import Annotated
from app.db import get_session
from sqlmodel import SQLModel, Session
from io import StringIO
import csv
from app.db import engine
from app.models import Product
app = FastAPI()

@app.get("/")
def root():
    
    return {"message": "hi bros"}

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)
@app.post("/uploadfile/")
async def create_upload_file(file: UploadFile=File(...),
                             db : Session = Depends(get_session)):

        contents = await file.read()    #reading the file which is uploaded
        csv_text = contents.decode("utf-8")  #decoding the file from binary to text
        reader = csv.DictReader(StringIO(csv_text))  #creating a csv reader object to read the csv file  

        # for row in reader:
        #     print(row)
        required_columns = ["name","sku","description"] 

        products = []

        for row in reader:
            try:
                product = Product(
                     
                    sku=row["sku"],
                    name=row["name"],
                    description=row["description"],
                    price = float(row["price"])
                     


                )

                products.append(product)
            except Exception as e:
                 print(f"skipping row {row} because of {e}")
        
        db.add_all(products)
        db.commit()
        return {
            "inserted : " : len(products)
        }

        