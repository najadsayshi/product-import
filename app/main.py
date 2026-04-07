from fastapi import FastAPI, UploadFile,File,Depends
from typing import Annotated
from app.db import get_session
from sqlmodel import SQLModel, Session
from sqlalchemy.exc import IntegrityError
from io import StringIO
import csv
import os
from app.db import engine
from app.models import Product
from dotenv import load_dotenv

load_dotenv()  # 👈 THIS  loads the .env file 
import uuid
from celery.result import AsyncResult
app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware
from app.router import crud


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)

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
    print(f"task id: {task.id}")
    return {
        "message": "file is being processed",
        "task_id": task.id
    }
from celery import Celery
REDIS_URL = os.getenv("REDIS_URL")

celery = Celery(
    __name__,
    broker=REDIS_URL,
    backend=REDIS_URL
)

celery.conf.update(
    broker_use_ssl={"ssl_cert_reqs": "none"},
    redis_backend_use_ssl={"ssl_cert_reqs": "none"},
)


@celery.task(bind=True)
def process_csv_file(self, file_path):
    batch_size = 1000
    batch = []
    inserted = 0

    
    total = 0
    with open(file_path, "r") as f:
        for _ in f:
            total += 1

    total = max(total - 1, 1)  # remove header safely

    
    with Session(engine) as db:
        with open(file_path, "r") as f:
            reader = csv.DictReader(f)

            for i, row in enumerate(reader):
                try:
                    product = Product(
                        sku=row["sku"],
                        name=row["name"],
                        description=row["description"],
                        price=float(row["price"])
                    )
                    batch.append(product)

                except Exception as e:
                    print(f"skipping row {row} because of {e}")

                
            
                if len(batch) >= batch_size:
                    try:
                        db.add_all(batch)
                        db.commit()

                        inserted += len(batch)
                        batch.clear()
                    
                    except IntegrityError:
                        db.rollback()
                        for product in batch:
                            try:
                                db.add(product)
                                db.commit()
                                inserted+=1
                            except IntegrityError:
                                db.rollback()
                                print(f"skipping product {product.sku} because of integrity error")
                            finally:
                                batch.clear()

                
                if i % 1000 == 0 or i == total - 1:
                    percent = int((inserted / total) * 100)

                    self.update_state(
                        state="PROGRESS",
                        meta={
                            "stage": "Parsing Csv",
                            "current": inserted,
                            "total": total,
                            "percent": percent
                        },
                    )

        
        if batch:
            for product in batch:
                try:
                    db.add(product)
                    db.commit()
                    inserted += 1
                except IntegrityError:
                    db.rollback()
                    print(f"skipping remaining batch because of integrity error")

            self.update_state(
                state="PROGRESS",
                meta={
                    "stage": "Validating",
                    "current": inserted,
                    "total": total,
                    "percent": 99
                },
                )

    # ✅ DONE
    return {
        "stage": "Import Completed",
        "inserted": inserted,
        "percent": 100
    }


#progress bar or visibility endpoint
@app.get("/task/{task_id}")
def get_progress(task_id: str):
    task = AsyncResult(task_id, app = celery)

    if task.state == "PENDING":
        return {"state" : "pending",
                "percent" : 0}
    elif task.state == "PROGRESS":
        return {
            "state" : "processing",
            **(task.info or {})
        }
    elif task.state == "SUCCESS":
        return {
            "state" : "Completed",
            "percent" : 100,
            "result" : task.result
            
        }
    
    return {"state" : task.state}


#crud

app.include_router(crud.router)