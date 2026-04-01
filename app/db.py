import os
from sqlmodel import  create_engine,SQLModel,Session
from dotenv import load_dotenv
load_dotenv()  # 👈 THIS  loads the .env file ,I DIDNT KNOW THAT

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL,echo = True)

def get_session():
    with Session(engine) as session:
        yield session   
