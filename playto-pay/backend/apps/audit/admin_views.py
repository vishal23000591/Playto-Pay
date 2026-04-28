from rest_framework import views
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum, Count
from apps.payouts.models import Payout
from apps.merchants.models import Merchant

class AdminAnalyticsView(views.APIView):

    permission_classes = [IsAuthenticated]

    def get(self, request):
        total_volume = Payout.objects.filter(status='completed').aggregate(sum=Sum('amount_paise'))['sum'] or 0
        total_payouts = Payout.objects.count()
        success_payouts = Payout.objects.filter(status='completed').count()
        active_merchants = Merchant.objects.count()
        
        failure_rate = ((total_payouts - success_payouts) / total_payouts * 100) if total_payouts > 0 else 0
        
        return Response({
            'total_volume_paise': total_volume,
            'total_payouts': total_payouts,
            'success_rate': 100 - failure_rate,
            'active_merchants': active_merchants,
            'recent_payouts': Payout.objects.order_by('-created_at')[:10].values(
                'id', 'merchant__name', 'amount_paise', 'status', 'created_at'
            )
        })