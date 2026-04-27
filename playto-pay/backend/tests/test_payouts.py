import pytest
import uuid
import threading
import json
from django.urls import reverse
from rest_framework.test import APIClient
from apps.merchants.models import Merchant, BankAccount
from apps.payouts.models import Payout
from django.db import transaction, connection
from django.conf import settings
import time

@pytest.fixture(autouse=True)
def setup_test_settings():
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_TASK_EAGER_PROPAGATES = True

@pytest.mark.django_db(transaction=True)
def test_payout_concurrency():
    if connection.vendor == 'sqlite':
        pytest.skip("Concurrency test requires PostgreSQL")

    merchant = Merchant.objects.create(name="Test Merchant", email="test@test.com", available_balance_paise=10000)
    bank = BankAccount.objects.create(merchant=merchant, account_holder="Test", account_number="123", ifsc="IFSC", bank_name="Bank")
    
    results = []
    
    def attempt_payout():
        client = APIClient()
        connection.close()
        try:
            response = client.post(
                reverse('payout-list'),
                {
                    'merchant_id': merchant.id,
                    'amount_paise': 6000,
                    'bank_account_id': bank.id
                },
                format='json',
                HTTP_IDEMPOTENCY_KEY=str(uuid.uuid4())
            )
            results.append(response.status_code)
        except Exception as e:
            results.append(str(e))

    threads = [threading.Thread(target=attempt_payout) for _ in range(2)]
    for t in threads: t.start()
    for t in threads: t.join()

    assert 201 in results
    assert results.count(201) == 1

@pytest.mark.django_db
def test_idempotency():
    merchant = Merchant.objects.create(name="Idem Merchant", email="idem@test.com", available_balance_paise=10000)
    bank = BankAccount.objects.create(merchant=merchant, account_holder="Test", account_number="123", ifsc="IFSC", bank_name="Bank")
    
    client = APIClient()
    key = str(uuid.uuid4())
    
    payload = {
        'merchant_id': merchant.id,
        'amount_paise': 1000,
        'bank_account_id': bank.id
    }
    
    # First request
    resp1 = client.post(reverse('payout-list'), payload, format='json', HTTP_IDEMPOTENCY_KEY=key)
    assert resp1.status_code == 201
    payout_id = resp1.data['id']
    
    # Second request with same key
    resp2 = client.post(reverse('payout-list'), payload, format='json', HTTP_IDEMPOTENCY_KEY=key)
    assert resp2.status_code == 201
    
    if hasattr(resp2, 'data'):
        resp2_data = resp2.data
    else:
        resp2_data = json.loads(resp2.content)
        
    assert resp2_data['id'] == payout_id
    assert Payout.objects.filter(merchant=merchant).count() == 1

@pytest.mark.django_db
def test_retry_and_fail_refund(mocker):
    from apps.payouts.tasks import process_payout_task
    
    merchant = Merchant.objects.create(name="Retry Merchant", email="retry@test.com", available_balance_paise=10000, held_balance_paise=5000)
    bank = BankAccount.objects.create(merchant=merchant, account_holder="Test", account_number="123", ifsc="IFSC", bank_name="Bank")
    
    payout = Payout.objects.create(
        merchant=merchant,
        bank_account=bank,
        amount_paise=5000,
        status='pending'
    )
    
    mocker.patch('random.choices', return_value=['stuck'])
    
    class MockTask:
        request = type('obj', (object,), {'retries': 3})
        max_retries = 3
        def retry(self, *args, **kwargs): pass

    # Call the undecorated function directly
    process_payout_task.__wrapped__(MockTask(), payout.id)
    
    payout.refresh_from_db()
    merchant.refresh_from_db()
    
    assert payout.status == 'failed'
    assert merchant.available_balance_paise == 15000
    assert merchant.held_balance_paise == 0
