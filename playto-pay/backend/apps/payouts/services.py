import logging
import threading
import time
from django.db import transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.merchants.models import Merchant, BankAccount
from apps.ledger.models import LedgerEntry
from apps.payouts.models import Payout
from apps.audit.services import AuditService
from apps.webhooks.services import WebhookService
from .tasks import complete_payout, fail_payout

logger = logging.getLogger(__name__)

def background_process_payout(payout_id):
    try:
        # Initial delay for UI refresh
        time.sleep(2)
        
        payout = Payout.objects.get(id=payout_id)
        if payout.status != 'pending':
            return

        # If flagged for fraud, we might pause here or require manual approval
        # For now, we process but log the risk
        
        # Mark as processing
        payout.status = 'processing'
        payout.save()

        # Simulated Bank Work (15 seconds)
        time.sleep(15)

        # Finalize
        complete_payout(payout)
        
        # Trigger Webhook
        WebhookService.trigger_event(
            payout.merchant, 
            'payout.completed', 
            {'payout_id': str(payout.id), 'amount': payout.amount_paise}
        )
        
        # Audit Log
        AuditService.log(
            payout.merchant, 'PAYOUT_COMPLETE', 'Payout', payout.id,
            f"Successfully withdrew ₹{payout.amount_paise/100:.2f}"
        )
        
    except Exception as e:
        logger.error(f"Error in background payout: {e}")

class PayoutService:
    @staticmethod
    @transaction.atomic
    def create_payout(merchant_id, bank_account_id, amount_paise, idempotency_key_str=None, scheduled_at=None):
        if amount_paise < 10000:
            raise ValidationError("Minimum payout amount is ₹100")

        merchant = Merchant.objects.select_for_update().get(id=merchant_id)
        
        try:
            bid = int(bank_account_id)
            bank_account = BankAccount.objects.get(id=bid, merchant=merchant)
        except (BankAccount.DoesNotExist, ValueError):
            raise ValidationError("Invalid bank account")

        if merchant.available_balance_paise < amount_paise:
            raise ValidationError("Insufficient balance")

        # --- Fraud Detection Logic ---
        risk_score = 0
        fraud_reasons = []
        
        # Rule 1: Velocity check (recent payouts)
        recent_count = Payout.objects.filter(
            merchant=merchant, 
            created_at__gte=timezone.now() - timezone.timedelta(minutes=5)
        ).count()
        if recent_count > 5:
            risk_score += 50
            fraud_reasons.append("High velocity: Multiple payouts in short period")
            
        # Rule 2: High value threshold
        if amount_paise > 5000000: # ₹50,000
            risk_score += 30
            fraud_reasons.append("High value: Exceeds ₹50,000 threshold")

        is_flagged = risk_score >= 50

        # Update balances
        merchant.available_balance_paise -= amount_paise
        merchant.held_balance_paise += amount_paise
        merchant.save()

        # Create Payout
        payout = Payout.objects.create(
            merchant=merchant,
            bank_account=bank_account,
            amount_paise=amount_paise,
            status='pending',
            idempotency_key=idempotency_key_str,
            scheduled_at=scheduled_at,
            risk_score=risk_score,
            fraud_reason=", ".join(fraud_reasons),
            is_flagged=is_flagged
        )

        # Ledger: HOLD
        LedgerEntry.objects.create(
            merchant=merchant,
            type='HOLD',
            amount_paise=amount_paise,
            reference_id=f"payout_{payout.id}",
            description=f"Withdrawal hold for ₹{amount_paise/100:.2f}"
        )

        # Audit Log
        AuditService.log(
            merchant, 'PAYOUT_REQUEST', 'Payout', payout.id,
            f"Requested withdrawal of ₹{amount_paise/100:.2f}. Risk Score: {risk_score}"
        )

        # Process (if not scheduled for far future)
        if not scheduled_at or scheduled_at <= timezone.now():
            thread = threading.Thread(target=background_process_payout, args=(payout.id,))
            thread.daemon = True
            thread.start()
        
        return payout
