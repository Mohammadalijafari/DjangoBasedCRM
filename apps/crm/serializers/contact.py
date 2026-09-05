from rest_framework import serializers
from apps.crm.models import Contact


class ContactSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Contact
        fields = [
            "id", "first_name", "last_name", "full_name", "email", "phone",
            "job_title", "company", "owner", "tags", "lead_source",
            "custom_fields", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class ContactCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "first_name", "last_name", "email", "phone", "job_title",
            "company", "owner", "tags", "lead_source", "custom_fields",
        ]


class ContactUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contact
        fields = [
            "first_name", "last_name", "email", "phone", "job_title",
            "company", "owner", "tags", "custom_fields",
        ]
        extra_kwargs = {field: {"required": False} for field in fields}
