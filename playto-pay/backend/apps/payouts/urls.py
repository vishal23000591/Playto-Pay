from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PayoutViewSet, DashboardView, LedgerViewSet, TopUpView,
    PayoutExportView, LedgerExportView, PayoutPDFExportView
)
from apps.audit.views import AuditLogViewSet
from apps.audit.admin_views import AdminAnalyticsView
from apps.webhooks.views import WebhookEndpointViewSet

router = DefaultRouter()
router.register(r'payouts', PayoutViewSet, basename='payout')
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')
router.register(r'webhook-endpoints', WebhookEndpointViewSet, basename='webhook-endpoint')

urlpatterns = [
    path('', include(router.urls)),
    path('dashboard/', DashboardView.as_view(), name='dashboard'),
    path('admin-analytics/', AdminAnalyticsView.as_view(), name='admin-analytics'),
    path('ledger/', LedgerViewSet.as_view({'get': 'list'}), name='ledger'),
    path('export/payouts/', PayoutExportView.as_view(), name='export-payouts'),
    path('export/ledger/', LedgerExportView.as_view(), name='export-ledger'),
    path('export/pdf/', PayoutPDFExportView.as_view(), name='export-pdf'),
    path('topup/', TopUpView.as_view(), name='topup'),
    path('', include('apps.merchants.urls')),
]