from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoginView, MeView, SignupView, BankAccountViewSet

router = DefaultRouter()
router.register(r'bank-accounts', BankAccountViewSet, basename='bank-account')

urlpatterns = [
    # Auth endpoints
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/signup/', SignupView.as_view(), name='auth_signup'),
    path('auth/me/', MeView.as_view(), name='auth_me'),
    
    # Resource endpoints
    path('', include(router.urls)),
]
