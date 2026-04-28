# Playto Pay – Payout Infrastructure for Modern Business

Playto Pay is a secure, production-grade financial infrastructure platform designed for agencies and businesses. It manages the entire lifecycle of merchant payouts—from balance tracking and ledger integrity to automated bank processing and financial reporting.

---

## Key Features

- **Double-Entry Ledger**: Every financial movement is recorded as an immutable ledger entry, ensuring a 100% auditable history.
- **Concurrency Control**: Implements PostgreSQL row-level locking (pessimistic locking) to prevent race conditions during balance updates.
- **Idempotency Protection**: A custom middleware-driven idempotency system ensures that no payout is ever processed twice.
- **Real-time Dashboard**: Advanced analytics for payout success rates, volume trends, and balance tracking.
- **Automated Reporting**: System-generated PDF Settlement Statements and CSV exports for financial reconciliation.
- **Asynchronous Processing**: Background bank transfers powered by Celery and Redis with intelligent retry logic.

---

## Technical Stack

- **Backend**: Django, Django Rest Framework (Python)
- **Frontend**: React, Vite, Tailwind CSS, TanStack Query
- **Database**: PostgreSQL (Production), SQLite (Development)
- **Task Queue**: Celery with Redis
- **Security**: JWT Authentication, CSRF Protection, strictly scoped API permissions
- **Reporting**: ReportLab for PDF generation

---

## Getting Started

### Local Setup (Recommended)
The easiest way to run the project locally is using the provided automation script:

```bash
./local.sh
```

This script will:
1. Start the Django development server.
2. Spin up Redis and the Celery worker.
3. Serve the integrated React frontend.

Access the application at: `http://localhost:8000`

### Production Deployment
The application is optimized for deployment on Render.
- **Production URL**: https://playto-pay.onrender.com
- **Architecture**: Single-container deployment serving both the API and the React build.

---

## Project Structure

- `backend/`: Django core, apps (merchants, payouts, ledger, etc.), and configuration.
- `frontend/`: React source code, components, and Vite configuration.
- `frontend/dist/`: Production build of the frontend, served by Django.
- `EXPLAINER.md`: Deep dive into the architectural decisions and engineering principles.

---

## Testing

The backend includes a comprehensive test suite covering:
- **Concurrency**: Validating row-level locks under high load.
- **Idempotency**: Ensuring duplicate requests do not create duplicate payouts.
- **Integrity**: Verifying that the ledger correctly matches the cached merchant balance.

To run tests:
```bash
cd backend
pytest
```

---

Developed by Vishal S.
For technical details on the underlying engine, please refer to the [EXPLAINER.md](./EXPLAINER.md).
