from fastapi import FastAPI, UploadFile,File,Depends
from typing import Annotated
from app.db import get_session
from sqlmodel import SQLModel, Session
from io import StringIO
import csv
import os
from app.db import engine
from app.models import Product
import uuid
app = FastAPI()

@app.get("/")
def root():
    
    return {"message": "hi bros"}

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
@app.post("/uploadfile/")
async def create_upload_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_session)
):
    file_id = str(uuid.uuid4())
    file_path = os.path.join(UPLOAD_DIR, f"{file_id}.csv")

    # ✅ SAVE FILE (IMPORTANT)
    with open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):  # 1MB chunks
            f.write(chunk)

    #SEND ONLY PATH
    task = process_csv_file.delay(file_path)

    return {
        "message": "file is being processed",
        "task_id": task.id
    }
from celery import Celery

REDIS_URL = "rediss://default:gQAAAAAAAV2HAAIncDFmYzdkOGVhYjYyMDM0YzdjOWU0MWQ5NzZlOTUxY2IwZHAxODk0Nzk@ample-walrus-89479.upstash.io:6379"

celery = Celery(
    __name__,
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery.conf.update(
    broker_use_ssl={"ssl_cert_reqs": "none"},
    redis_backend_use_ssl={"ssl_cert_reqs": "none"},
)

@celery.task
def process_csv_file(file_path):
    products = []

    with open(file_path, "r") as f:
        reader = csv.DictReader(f)

        for row in reader:
            try:
                product = Product(
                    sku=row["sku"],
                    name=row["name"],
                    description=row["description"],
                    price=float(row["price"])
                )
                products.append(product)

            except Exception as e:
                print(f"skipping row {row} because of {e}")

    
    with Session(engine) as db:
        db.add_all(products)
        db.commit()

    return {
        "inserted": len(products)
    }