# 📄 Playto Pay – Technical Explainer

### 1. Ledger Query and Why This Model?
We use a **Double-Entry Ledger** model. Every movement of money is recorded as a `CREDIT`, `DEBIT`, `HOLD`, or `RELEASE`. 

**The Query:**
```sql
SELECT 
    SUM(amount_paise) FILTER (WHERE type IN ('CREDIT', 'RELEASE')) - 
    SUM(amount_paise) FILTER (WHERE type IN ('DEBIT', 'HOLD')) 
AS calculated_balance 
FROM ledger_ledgerentry WHERE merchant_id = X;
```
**Why?**
- **Auditability**: We never delete history. We can reconstruct a merchant's balance at any point in time.
- **Integrity**: The `Merchant.available_balance_paise` is just a cache. The source of truth is the ledger. This prevents "phantom balance" issues.

### 2. Exact Lock Code Preventing Overdraft
To prevent race conditions (two requests withdrawing simultaneously), we use **PostgreSQL Row-Level Locking**.

```python
with transaction.atomic():
    # Lock the merchant row for this transaction
    merchant = Merchant.objects.select_for_update().get(id=merchant_id)
    
    if merchant.available_balance_paise < amount_paise:
        raise ValidationError("Insufficient balance")
    
    merchant.available_balance_paise -= amount_paise
    merchant.save()
```
`select_for_update()` blocks other transactions from reading or writing this merchant until the current transaction commits. This is the only way to safely handle money in a high-concurrency environment.

### 3. How Idempotency Works during Duplicate Requests
We implement a custom `IdempotencyMiddleware`. 
1. Client sends `Idempotency-Key: UUID`.
2. Middleware checks if this key exists for the merchant.
3. If it exists and has a response: Return the **exact same** response immediately.
4. If it exists but no response: Return `409 Conflict` (request already in progress).
5. If new: Create an `IdempotencyKey` record as a "claim" and proceed. After the view returns, save the response body and status code.

### 4. Where Invalid Payout State Transitions Blocked?
Transitions are blocked in `apps/payouts/tasks.py` inside an atomic block:

```python
with transaction.atomic():
    payout = Payout.objects.select_for_update().get(id=payout_id)
    
    # State Machine Enforcement
    if payout.status not in ['pending', 'processing']:
        logger.warning("Illegal transition")
        return # Block any movement out of terminal states (completed/failed)
```
This ensures that a `completed` payout can never be `failed` or `retried` again.

### 5. AI-Generated Wrong Code vs. Corrected Version

**❌ WRONG (The "Junior" way):**
```python
# Race condition prone!
merchant = Merchant.objects.get(id=1)
if merchant.balance >= amount:
    # Another thread could deduct balance right here!
    merchant.balance -= amount
    merchant.save()
```

**✅ CORRECT (The "Founding Engineer" way):**
```python
from django.db import transaction

with transaction.atomic():
    # 1. Lock the row immediately
    merchant = Merchant.objects.select_for_update().get(id=1)
    
    # 2. Re-check condition INSIDE the lock
    if merchant.balance < amount:
        raise ValueError("Insufficient funds")
        
    # 3. Update and save within the same transaction
    merchant.balance -= amount
    merchant.save()
```
The corrected version uses database transactions and pessimistic locking to ensure that the balance check and deduction are atomic and thread-safe.
