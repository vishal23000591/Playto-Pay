import requests
import json
from django.utils import timezone
from .models import WebhookEndpoint, WebhookEvent

class WebhookService:
    @staticmethod
    def trigger_event(merchant, event_type, payload):
        endpoints = WebhookEndpoint.objects.filter(merchant=merchant, is_active=True)
        for endpoint in endpoints:
            event = WebhookEvent.objects.create(
                endpoint=endpoint,
                event_type=event_type,
                payload=payload
            )


            WebhookService.send_webhook(event.id)

    @staticmethod
    def send_webhook(event_id):
        try:
            event = WebhookEvent.objects.get(id=event_id)
            event.attempts += 1
            event.last_attempt_at = timezone.now()
            
            headers = {
                'Content-Type': 'application/json',
                'X-Webhook-Secret': event.endpoint.secret,
                'X-Event-Type': event.event_type
            }
            
            response = requests.post(
                event.endpoint.url, 
                data=json.dumps(event.payload), 
                headers=headers,
                timeout=5
            )
            
            if response.status_code == 200:
                event.status = 'sent'
            else:
                event.status = 'failed'
            
            event.save()
        except Exception:
            event = WebhookEvent.objects.get(id=event_id)
            event.status = 'failed'
            event.save()