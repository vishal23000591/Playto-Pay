from .models import AuditLog

class AuditService:
    @staticmethod
    def log(merchant, action, resource_type, resource_id=None, description="", user=None, ip_address=None):
        return AuditLog.objects.create(
            merchant=merchant,
            action=action,
            resource_type=resource_type,
            resource_id=str(resource_id) if resource_id else None,
            description=description,
            user=user,
            ip_address=ip_address
        )
