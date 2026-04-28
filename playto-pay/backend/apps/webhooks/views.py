from rest_framework import viewsets, serializers, status
from rest_framework.response import Response
from .models import WebhookEndpoint

class WebhookEndpointSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEndpoint
        fields = ['id', 'url', 'secret', 'is_active', 'created_at']
        read_only_fields = ['secret']

class WebhookEndpointViewSet(viewsets.ModelViewSet):
    serializer_class = WebhookEndpointSerializer

    def get_queryset(self):
        return WebhookEndpoint.objects.filter(merchant=self.request.user.merchant)

    def perform_create(self, serializer):

        WebhookEndpoint.objects.filter(merchant=self.request.user.merchant).delete()
        serializer.save(merchant=self.request.user.merchant)