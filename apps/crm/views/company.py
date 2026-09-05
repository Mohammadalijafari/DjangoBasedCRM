from rest_framework import viewsets
from rest_framework.filters import SearchFilter
from typing import cast
from apps.crm.models import Company
from apps.crm.serializers import CompanySerializer
from apps.core.permissions import IsTenantMember
from apps.organizations.models import User


class CompanyViewSet(viewsets.ModelViewSet):
    permission_classes = [IsTenantMember]
    serializer_class = CompanySerializer
    filter_backends = [SearchFilter]
    search_fields = ["name", "domain", "industry"]

    def get_queryset(self):
        user = cast(User, self.request.user)
        return Company.objects.filter(organization_id=user.organization_id)

    def perform_create(self, serializer):
        user = cast(User, self.request.user)
        serializer.save(organization_id=user.organization_id)

    def perform_destroy(self, instance):
        instance = cast(Company, instance)
        instance.soft_delete()
