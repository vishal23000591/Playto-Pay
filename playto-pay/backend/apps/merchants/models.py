from django.db import models
from django.contrib.auth.models import User

class Merchant(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='merchant')
    name = models.CharField(max_length=255)
    email = models.EmailField(unique=True)
    available_balance_paise = models.BigIntegerField(default=0)
    held_balance_paise = models.BigIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} - Available: {self.available_balance_paise}"

class BankAccount(models.Model):
    merchant = models.ForeignKey(Merchant, on_delete=models.CASCADE, related_name='bank_accounts')
    account_holder = models.CharField(max_length=255)
    account_number = models.CharField(max_length=255)
    ifsc = models.CharField(max_length=20)
    bank_name = models.CharField(max_length=255)
    branch_name = models.CharField(max_length=255, blank=True, null=True)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('merchant', 'account_number')

    def __str__(self):
        return f"{self.bank_name} - {self.account_number}"

    def save(self, *args, **kwargs):
        if self.is_default:

            BankAccount.objects.filter(merchant=self.merchant).update(is_default=False)
        super().save(*args, **kwargs)