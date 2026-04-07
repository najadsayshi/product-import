# ProductFlow — Bulk Product Import

A backend-heavy FastAPI application for bulk-importing products from CSV files using Celery background workers, with a full CRUD dashboard frontend.

## Overview

Upload a CSV file → backend offloads processing to a Celery worker → frontend polls real-time progress → products land in PostgreSQL. A built-in dashboard lets you view, add, edit, and delete products without touching the database directly.

## Tech Stack

| Layer | Technology |
|---|---|
| API | FastAPI |
| Background Workers | Celery |
| Message Broker / Result Backend | Redis |
| Database | PostgreSQL |
| ORM | SQLModel (SQLAlchemy) |
| Frontend | Vanilla HTML / CSS / JS |
| Server | Uvicorn |

## Project Structure

```
background-worker/
├── app/
│   ├── main.py          # FastAPI app, upload endpoint, Celery task, progress endpoint
│   ├── db.py            # SQLAlchemy engine + session
│   ├── models.py        # Product SQLModel table
│   ├── schemas.py       # Pydantic request schemas
│   └── router/
│       └── crud.py      # CRUD endpoints for products
├── frontend/
│   ├── index.html       # Dashboard UI
│   ├── styles.css       # Styles
│   └── app.js           # Frontend logic
├── uploads/             # Temporary CSV storage
├── requirements.txt
└── .env
```

## API Endpoints

### Import

| Method | Path | Description |
|---|---|---|
| `POST` | `/uploadfile/` | Upload a CSV file, returns a `task_id` |
| `GET` | `/task/{task_id}` | Poll Celery task progress |

### Products (CRUD)

| Method | Path | Description |
|---|---|---|
| `GET` | `/items` | List products (paginated: `page`, `page_size`) |
| `POST` | `/items` | Create a single product |
| `PATCH` | `/items/{id}` | Update a product (name, description, price) |
| `DELETE` | `/items/{id}` | Delete a single product |
| `DELETE` | `/items` | Delete all products |

### CSV Format

The uploaded file must be a `.csv` with these columns:

```
sku,name,description,price
PROD-001,Widget A,A great widget,19.99
```

SKUs must be unique. Duplicate rows are silently skipped.

## Setup

### 1. Clone & create a virtual environment

```bash
git clone <repo-url>
cd background-worker
python -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/yourdb
REDIS_URL=redis://localhost:6379/0
```

### 4. Run the FastAPI server

```bash
uvicorn app.main:app --reload
```

### 5. Run the Celery worker

In a separate terminal:

```bash
celery -A app.main.celery worker --loglevel=info
```

### 6. Open the frontend

Open `frontend/index.html` in your browser, or serve it with any static file server.

## How It Works

1. User uploads a CSV via the dashboard.
2. FastAPI saves the file to `uploads/` and queues a Celery task.
3. The Celery worker reads the CSV in batches of 1,000 rows, inserting products into PostgreSQL.
4. Every 1,000 rows, the worker updates task state with `current`, `total`, and `percent`.
5. The frontend polls `GET /task/{task_id}` every 1.2 seconds and renders a live progress bar.
6. On completion, the full product list is accessible via the Products tab.

---

Built by **Najad Goat**