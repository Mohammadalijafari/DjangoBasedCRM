from rest_framework import viewsets
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter

from apps.crm.models import Contact
from apps.crm.serializers import ContactSerializer, ContactCreateSerializer, ContactUpdateSerializer
from apps.core.permissions import IsTenantMember


class ContactViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTenantMember]
    filter_backends = [DjangoFilterBackend, SearchFilter]
    filterset_fields = ["company", "owner", "lead_source"]
    search_fields = ["first_name", "last_name", "email"]

    def get_queryset(self):
        # The single most important line in this file: without it, a user
        # could read/edit any organization's contacts by guessing UUIDs.
        return Contact.objects.filter(organization_id=self.request.user.organization_id)

    def get_serializer_class(self):
        if self.action == "create":
            return ContactCreateSerializer
        if self.action in ("update", "partial_update"):
            return ContactUpdateSerializer
        return ContactSerializer

    def perform_create(self, serializer):
        serializer.save(organization_id=self.request.user.organization_id)

    def perform_destroy(self, instance):
        # Soft delete instead of the ModelViewSet default hard delete.
        instance.soft_delete()
