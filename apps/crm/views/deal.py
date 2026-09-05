import uuid
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend

from apps.crm.models import Deal
from apps.crm.serializers import (
    DealSerializer, DealCreateSerializer, DealUpdateSerializer,
    DealStageMoveSerializer, PipelineStageSummarySerializer,
)
from apps.crm.services import DealService
from apps.core.permissions import IsTenantMember


class DealViewSet(viewsets.ViewSet):
    """
    Deal endpoints. Deliberately built on plain ViewSet (not ModelViewSet)
    so the service layer — not DRF's generic mixins — owns all business
    rules, matching the FastAPI version's explicit endpoint bodies.
    """

    permission_classes = [IsTenantMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ["stage", "pipeline", "owner", "company"]

    def get_service(self, request) -> DealService:
        return DealService(organization_id=request.user.organization_id)

    def get_queryset(self, request):
        # Tenant isolation at the list level — never trust a client-supplied filter alone.
        return Deal.objects.filter(organization_id=request.user.organization_id)

    def list(self, request):
        queryset = self.filter_queryset_manually(request, self.get_queryset(request))
        page = request.query_params.get("page")
        serializer = DealSerializer(queryset, many=True)
        return Response(serializer.data)

    def filter_queryset_manually(self, request, queryset):
        for field in self.filterset_fields:
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        return queryset

    def create(self, request):
        serializer = DealCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = self.get_service(request)
        deal = service.create_deal(serializer.validated_data)
        return Response(DealSerializer(deal).data, status=status.HTTP_201_CREATED)

    def retrieve(self, request, pk=None):
        service = self.get_service(request)
        deal = service.get_deal_or_404(pk)
        return Response(DealSerializer(deal).data)

    def partial_update(self, request, pk=None):
        serializer = DealUpdateSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        service = self.get_service(request)
        deal = service.update_deal(pk, serializer.validated_data)
        return Response(DealSerializer(deal).data)

    def destroy(self, request, pk=None):
        # RBAC check done here rather than in permission_classes because it
        # only applies to this one action, not the whole viewset.
        if request.user.role not in ("admin", "owner", "manager"):
            return Response(
                {"detail": "Insufficient permissions for this operation"},
                status=status.HTTP_403_FORBIDDEN,
            )
        service = self.get_service(request)
        deal = service.get_deal_or_404(pk)
        deal.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["post"], url_path="move-stage")
    def move_stage(self, request, pk=None):
        serializer = DealStageMoveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = self.get_service(request)
        deal = service.move_stage(
            deal_id=pk,
            new_stage_id=serializer.validated_data["stage_id"],
            actor_id=request.user.id,
        )
        return Response(DealSerializer(deal).data)

    @action(detail=False, methods=["get"], url_path="pipeline/(?P<pipeline_id>[^/.]+)/board")
    def pipeline_board(self, request, pipeline_id=None):
        """Kanban view: each stage with its deal count and total value."""
        service = self.get_service(request)
        data = service.get_pipeline_board(pipeline_id)
        serializer = PipelineStageSummarySerializer(data, many=True)
        return Response(serializer.data)
