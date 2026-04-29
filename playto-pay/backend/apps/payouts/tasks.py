import random
import time
from celery import shared_task
from django.db import transaction
from django.conf import settings
from django.core.mail import send_mail
from django.template.loader import render_to_string
from apps.payouts.models import Payout
from apps.ledger.models import LedgerEntry
from apps.merchants.models import Merchant

@shared_task(bind=True)
def process_payout_task(self, payout_id):
    """
    Background worker to process a payout withdrawal.
    Increased delay to 20s so the user can actually see the HELD state.
    """
    try:
        payout = Payout.objects.get(id=payout_id)
        if payout.status != 'pending':
            return f"Payout {payout_id} already processed"


        payout.status = 'processing'
        payout.save()


        time.sleep(20)


        complete_payout(payout)
        return f"Payout {payout_id} completed successfully"

    except Payout.DoesNotExist:
        return f"Payout {payout_id} not found"
    except Exception as exc:
        if self.request.retries >= self.max_retries:
            fail_payout(Payout.objects.get(id=payout_id))
            return f"Payout {payout_id} failed after max retries"
        raise self.retry(exc=exc, countdown=5)

@transaction.atomic
def complete_payout(payout):
    merchant = Merchant.objects.select_for_update().get(id=payout.merchant.id)
    

    merchant.held_balance_paise -= payout.amount_paise
    merchant.save()

    payout.status = 'completed'
    payout.processed_at = payout.updated_at
    payout.save()




    LedgerEntry.objects.create(
        merchant=merchant,
        type='RELEASE',
        amount_paise=payout.amount_paise,
        reference_id=f"payout_rel_{payout.id}",
        description=f"Released hold for payout {payout.id}"
    )
    LedgerEntry.objects.create(
        merchant=merchant,
        type='DEBIT',
        amount_paise=payout.amount_paise,
        reference_id=f"payout_fin_{payout.id}",
        description=f"Final withdrawal to {payout.bank_account.bank_name}"
    )

    try:
        html_content = render_to_string('emails/payout_completed.html', {
            'merchant_name': merchant.name,
            'amount_inr': f"{payout.amount_paise / 100:.2f}",
            'bank_name': payout.bank_account.bank_name,
            'account_last4': payout.bank_account.account_number[-4:],
            'reference_id': f"payout_fin_{payout.id}",
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard"
        })
        send_mail(
            subject='Payout Completed - Playto Pay',
            message=f'Your payout of INR {payout.amount_paise / 100:.2f} has been completed.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[merchant.email],
            html_message=html_content,
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send email: {e}")

@transaction.atomic
def fail_payout(payout):
    merchant = Merchant.objects.select_for_update().get(id=payout.merchant.id)
    

    merchant.held_balance_paise -= payout.amount_paise
    merchant.available_balance_paise += payout.amount_paise
    merchant.save()

    payout.status = 'failed'
    payout.save()

    LedgerEntry.objects.create(
        merchant=merchant,
        type='RELEASE',
        amount_paise=payout.amount_paise,
        reference_id=f"payout_frel_{payout.id}"
    )
    LedgerEntry.objects.create(
        merchant=merchant,
        type='REFUND',
        amount_paise=payout.amount_paise,
        reference_id=f"payout_ref_{payout.id}",
        description=f"Refunded failed payout {payout.id}"
    )

    try:
        html_content = render_to_string('emails/payout_failed.html', {
            'merchant_name': merchant.name,
            'amount_inr': f"{payout.amount_paise / 100:.2f}",
            'bank_name': payout.bank_account.bank_name,
            'account_last4': payout.bank_account.account_number[-4:],
            'reference_id': f"payout_ref_{payout.id}",
            'dashboard_url': f"{settings.FRONTEND_URL}/dashboard"
        })
        send_mail(
            subject='Payout Failed - Playto Pay',
            message=f'Your payout of INR {payout.amount_paise / 100:.2f} has failed.',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[merchant.email],
            html_message=html_content,
            fail_silently=True,
        )
    except Exception as e:
        print(f"Failed to send email: {e}")