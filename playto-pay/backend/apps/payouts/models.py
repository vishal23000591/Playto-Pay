import uuid
from django.db import models
from apps.merchants.models import Merchant, BankAccount

class Payout(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(Merchant, on_delete=models.PROTECT, related_name='payouts')
    bank_account = models.ForeignKey(BankAccount, on_delete=models.PROTECT)
    amount_paise = models.BigIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempts = models.IntegerField(default=0)
    idempotency_key = models.UUIDField(unique=True, null=True, blank=True)
    

    scheduled_at = models.DateTimeField(null=True, blank=True)
    risk_score = models.IntegerField(default=0)
    fraud_reason = models.TextField(null=True, blank=True)
    is_flagged = models.BooleanField(default=False)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.id} - {self.status} - {self.amount_paise}"