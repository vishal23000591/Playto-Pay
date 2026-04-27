from rest_framework import viewsets, serializers
from .models import AuditLog

class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = '__all__'

class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = AuditLogSerializer
    
    def get_queryset(self):
        return AuditLog.objects.filter(merchant=self.request.user.merchant)
