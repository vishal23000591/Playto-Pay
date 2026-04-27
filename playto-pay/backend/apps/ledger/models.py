from django.db import models
from apps.merchants.models import Merchant

class LedgerEntry(models.Model):
    ENTRY_TYPES = (
        ('CREDIT', 'Credit'),    # External funds in (Top-up)
        ('DEBIT', 'Debit'),      # External funds out (Payout Success)
        ('HOLD', 'Hold'),        # Funds frozen for payout
        ('RELEASE', 'Release'),  # Hold removed (Success or Failure)
        ('REFUND', 'Refund'),    # Funds returned to available (Failure)
    )

    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name='ledger_entries')
    type = models.CharField(max_length=10, choices=ENTRY_TYPES)
    amount_paise = models.BigIntegerField()
    reference_id = models.CharField(max_length=255, db_index=True)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {self.amount_paise} - {self.reference_id}"
