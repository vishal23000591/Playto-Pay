from django.db import models
import uuid
from apps.merchants.models import Merchant

class WebhookEndpoint(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='webhook_endpoints')
    url = models.URLField()
    secret = models.CharField(max_length=255, default=uuid.uuid4)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.merchant.name} - {self.url}"

class WebhookEvent(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    endpoint = models.ForeignKey(WebhookEndpoint, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=100) # e.g., 'payout.completed'
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    attempts = models.IntegerField(default=0)
    last_attempt_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} - {self.status}"
