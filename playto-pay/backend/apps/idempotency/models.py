from django.db import models
from apps.merchants.models import Merchant

class IdempotencyKey(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, null=True, blank=True)
    key = models.UUIDField(db_index=True)
    response = models.JSONField(null=True, blank=True)
    status_code = models.IntegerField(null=True, blank=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('merchant', 'key')

    def __str__(self):
        return str(self.key)