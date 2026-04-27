from django.db import models
from django.contrib.auth.models import User
from apps.merchants.models import Merchant

class AuditLog(models.Model):
    ACTION_CHOICES = (
        ('LOGIN', 'Login'),
        ('LOGOUT', 'Logout'),
        ('PAYOUT_REQUEST', 'Payout Request'),
        ('PAYOUT_COMPLETE', 'Payout Complete'),
        ('PAYOUT_FAIL', 'Payout Fail'),
        ('BANK_ADD', 'Bank Added'),
        ('BANK_DELETE', 'Bank Deleted'),
        ('BALANCE_TOPUP', 'Balance Topup'),
    )

    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='audit_logs')
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50) # e.g., 'Payout', 'BankAccount'
    resource_id = models.CharField(max_length=255, null=True, blank=True)
    description = models.TextField()
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.merchant.name} - {self.action} - {self.created_at}"
