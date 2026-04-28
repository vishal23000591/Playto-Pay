import json
import uuid
from datetime import timedelta
from django.utils import timezone
from django.http import JsonResponse
from .models import IdempotencyKey

class IdempotencyMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method not in ['POST', 'PUT', 'PATCH']:
            return self.get_response(request)

        idempotency_key_header = request.headers.get('Idempotency-Key')
        if not idempotency_key_header:
            return self.get_response(request)

        try:
            key_uuid = uuid.UUID(idempotency_key_header)
        except ValueError:
            print(f"DEBUG: Invalid Idempotency-Key format: {idempotency_key_header}")
            return JsonResponse({'error': 'Invalid Idempotency-Key format.'}, status=400)




        
        try:
            body = json.loads(request.body)
            merchant_id = body.get('merchant_id')
        except Exception:
            merchant_id = None


        existing_key = IdempotencyKey.objects.filter(key=key_uuid, merchant_id=merchant_id).first()
        
        if existing_key:
            if existing_key.response:
                print(f"DEBUG: Returning cached response for key {key_uuid}: {existing_key.response}")
                return JsonResponse(existing_key.response, status=existing_key.status_code)
            else:

                return JsonResponse({'error': 'Request is currently being processed.'}, status=409)


        idem_obj = IdempotencyKey.objects.create(
            key=key_uuid,
            merchant_id=merchant_id,
            expires_at=timezone.now() + timedelta(hours=24)
        )

        request._idempotency_obj = idem_obj

        response = self.get_response(request)

        if hasattr(request, '_idempotency_obj'):



            try:
                resp_data = json.loads(response.content)
            except Exception:
                resp_data = {'raw': str(response.content)}

            idem_obj.response = resp_data
            idem_obj.status_code = response.status_code
            idem_obj.save()

        return response