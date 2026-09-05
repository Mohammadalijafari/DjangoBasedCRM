from rest_framework import serializers
from apps.crm.models import Company


class CompanySerializer(serializers.ModelSerializer):
    class Meta:
        model = Company
        fields = [
            "id", "name", "domain", "industry", "size", "website", "phone",
            "address", "owner", "custom_fields", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
