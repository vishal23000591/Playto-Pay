# 💳 Playto Pay – Merchant Payout Engine

A production-grade fintech payout infrastructure platform where Indian freelancers/agencies receive USD payments and withdraw INR payouts. Built with a focus on money integrity, concurrency control, and scalability.

## 🚀 Quick Start (Docker)

The easiest way to run the entire stack is using Docker Compose:

```bash
docker-compose up --build
```

Once running:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **Seed Data**: Run a POST request to `http://localhost:8000/api/v1/seed-data/` to initialize a default merchant with balance.

## 🛠 Tech Stack

- **Backend**: Django, DRF, PostgreSQL, Celery, Redis
- **Frontend**: React (Vite), Tailwind CSS, Recharts, React Query
- **Orchestration**: Docker Compose

## 🏗 Setup & Development (Local)

### Backend
1. `cd backend`
2. `python -m venv venv && source venv/bin/activate`
3. `pip install -r requirements.txt`
4. `python manage.py migrate`
5. `python manage.py runserver`

### Celery Worker
```bash
celery -A config worker -l info
```

### Frontend
1. `cd frontend`
2. `npm install`
3. `npm run dev`

## 🧪 Testing

Run backend tests for concurrency, idempotency, and retries:

```bash
cd backend
pytest
```

## 🔐 Core Fintech Principles Implemented

1. **Money Integrity**: Balance is verified via ledger aggregation.
2. **Concurrency Protection**: `select_for_update()` ensures only one payout request can modify a merchant's balance at a time.
3. **Idempotency**: `Idempotency-Key` header ensures duplicate requests return the same response without duplicate processing.
4. **State Machine**: Strict transitions: `pending` -> `processing` -> `completed/failed`.
5. **Retry Logic**: Celery tasks with exponential backoff and atomic refunds on final failure.
