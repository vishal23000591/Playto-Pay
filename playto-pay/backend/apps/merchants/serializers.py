from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Merchant, BankAccount

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'first_name', 'last_name')

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = '__all__'
        read_only_fields = ('merchant',)

class MerchantSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    bank_accounts = BankAccountSerializer(many=True, read_only=True)
    class Meta:
        model = Merchant
        fields = '__all__'

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class SignupSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    merchant_name = serializers.CharField(max_length=255)