# Playto Pay – Technical Explainer & Project Overview

Playto Pay is a high-performance cross-border payment infrastructure designed for Indian agencies, freelancers, and online businesses. It provides a robust, secure, and auditable engine for managing payouts and merchant balances.

---

## Architecture & Core Principles

### 1. Double-Entry Ledger System
We treat money with extreme care. Instead of just updating a balance column, we use a Double-Entry Ledger model. Every transaction creates an immutable trail of CREDIT, DEBIT, HOLD, and RELEASE entries.

- The Source of Truth: The LedgerEntry table. 
- Integrity Check: We calculate the "Real Balance" by summing all ledger entries. If this doesn't match the Merchant.available_balance (which acts as a high-speed cache), the system flags an integrity error.
- Auditability: We never delete history. We can reconstruct a merchant's balance at any second in the past.

### 2. Concurrency Control (Pessimistic Locking)
In a fintech app, two simultaneous withdrawal requests must never result in a negative balance. We use PostgreSQL Row-Level Locking to prevent race conditions.

```python
with transaction.atomic():
    # Lock the merchant row exclusively for this transaction
    merchant = Merchant.objects.select_for_update().get(id=merchant_id)
    
    if merchant.available_balance_paise < amount_paise:
        raise ValidationError("Insufficient balance")
    
    merchant.available_balance_paise -= amount_paise
    merchant.save()
```
select_for_update() ensures that no other process can read or write to this merchant until the current transaction is finished.

### 3. Bulletproof Idempotency
To prevent accidental double-payouts (e.g., if a user clicks "Pay" twice or a network timeout occurs), we use a custom IdempotencyMiddleware.

1. The Key: Clients send a unique Idempotency-Key (UUID) with every POST request.
2. The Cache: We store the result of every successful request.
3. The Logic: 
   - If we see the same key again, we return the exact same cached response without re-running any logic.
   - If the request is still processing, we return a 409 Conflict.
   - This ensures that a payout is created exactly once, regardless of how many times the API is called.

### 4. Robust State Machine
Payouts follow a strict state machine: pending -> processing -> completed OR failed.
- Transitions are enforced inside atomic blocks.
- A terminal state (completed or failed) can never be changed.
- If a payout fails, the system automatically triggers a Refund ledger entry and restores the merchant's available balance.

## AI Pitfalls & Engineering Excellence

This project is built to be AI-native, not AI-dependent. Below are specific areas where standard AI-generated code often fails, and how we have implemented the correct, production-grade solutions.

### 1. The "Junior AI" Race Condition vs. Our Atomic Locking
Common AI Mistake: Standard LLMs often suggest simple "if balance >= amount: balance -= amount" logic. This fails in high-concurrency environments because another thread could deduct the balance between the check and the save.

Our Solution: We use Pessimistic Locking (select_for_update).
```python
with transaction.atomic():
    # 1. Row-level lock (blocks other threads)
    merchant = Merchant.objects.select_for_update().get(id=1)
    
    # 2. Re-check condition INSIDE the locked block
    if merchant.balance < amount:
        raise ValidationError("Insufficient funds")
```

### 2. Aggregation Integrity (Filtered Sums)
Common AI Mistake: Using multiple queries or Python-side loops to calculate totals, which is slow and prone to "off-by-one" errors.

Our Solution: We use database-level aggregation with Q objects in views.py. This pushes the heavy lifting to PostgreSQL for maximum speed and accuracy.
```python
LedgerEntry.objects.aggregate(
    total_in=Sum('amount_paise', filter=Q(type__in=['CREDIT', 'REFUND'])),
    total_out=Sum('amount_paise', filter=Q(type__in=['DEBIT']))
)
```

### 3. Middleware-Level Idempotency
Common AI Mistake: Putting idempotency logic inside the View function. This is messy and often misses edge cases like 500 errors.

Our Solution: We implemented a global IdempotencyMiddleware. This captures the exact response body and status code. If a duplicate request arrives, the middleware intercepts it before it even hits the view, returning the identical previous result. This is the gold standard for financial APIs.

### 4. Ledger-as-Truth Model
Common AI Mistake: Relying solely on a balance column. If that column gets corrupted, the money is lost.

Our Solution: In Playto Pay, the Merchant.balance is treated as a discardable cache. We can wipe the balance column and fully reconstruct it from the LedgerEntry table at any time. This ensures 100% financial auditability.

### 5. Asynchronous Email System
Common AI Mistake: Sending emails directly inside a request-response cycle. This makes the API slow and can cause 500 errors if the SMTP server is down.

Our Solution: We use Celery background tasks for all notifications. The API immediately returns a success response, while the email is queued for delivery. This ensures the user experience is never impacted by network latency from email providers.

---

## Tech Stack

- Backend: Django & Django Rest Framework (Python)
- Frontend: React (Vite) with Tailwind CSS
- Database: PostgreSQL (Production) / SQLite (Development)
- Async Tasks: Celery with Redis for background bank processing
- Deployment: Render (Integrated Frontend + Backend)
- Reporting: ReportLab for dynamic PDF Settlement Statements

---

## Key Features

- Merchant Dashboard: Real-time analytics on payout success rates and volume.
- Payout Management: Intelligent bank account validation and idempotency protection.
- Financial Reporting: Generate official PDF Settlement Statements and export CSV ledger history.
- Automated Emails: Real-time notifications for top-ups, successful settlements, and failed payouts.
- Security: JWT-based authentication, CSRF protection, and strictly scoped API access.

---

## Running Locally

1. One-Command Start: Use ./local.sh to spin up the database, Redis, Celery, and the Django server.
2. Integrated Frontend: The React frontend is pre-built into the Django static directory. Access the production app at https://playto-pay.onrender.com.
3. Environment: Configuration is managed via a .env file for easy production parity.

---

Developed with love by Vishal S.
