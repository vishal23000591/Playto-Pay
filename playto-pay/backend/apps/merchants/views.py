from rest_framework import status, views, viewsets
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.db import transaction
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import LoginSerializer, MerchantSerializer, SignupSerializer, BankAccountSerializer
from .models import Merchant, BankAccount

class LoginView(views.APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        user = authenticate(username=user.username, password=password)
        if user is None:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)
            
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'merchant': MerchantSerializer(user.merchant).data
        })

class MeView(views.APIView):
    def get(self, request):
        return Response(MerchantSerializer(request.user.merchant).data)

class SignupView(views.APIView):
    permission_classes = [AllowAny]

    @transaction.atomic
    def post(self, request):
        serializer = SignupSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        merchant_name = serializer.validated_data['merchant_name']
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'User with this email already exists'}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password
        )
        

        merchant = Merchant.objects.create(
            user=user,
            name=merchant_name,
            email=email,
            available_balance_paise=0,
            held_balance_paise=0
        )
        
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'merchant': MerchantSerializer(merchant).data
        }, status=status.HTTP_201_CREATED)

class BankAccountViewSet(viewsets.ModelViewSet):
    serializer_class = BankAccountSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BankAccount.objects.filter(merchant=self.request.user.merchant)

    def perform_create(self, serializer):
        serializer.save(merchant=self.request.user.merchant)