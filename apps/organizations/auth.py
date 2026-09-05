"""
By default SimpleJWT only puts the user id in the token. We embed
organization_id and role too, so every request can be authorized
without an extra database hit — mirroring the FastAPI version's JWT design.
"""
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView


class TenantTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["org"] = str(user.organization_id)
        token["role"] = user.role
        token["email"] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        if not self.user.is_active:
            from rest_framework import serializers
            raise serializers.ValidationError("Account is inactive")
        return data


class TenantTokenObtainPairView(TokenObtainPairView):
    serializer_class = TenantTokenObtainPairSerializer
