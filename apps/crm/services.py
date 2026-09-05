"""
Service layer: business rules live here — not in the view, not in the model manager.
Views only handle HTTP; models only define structure. Rules like "a closed deal
cannot be edited" belong here, exactly as in the FastAPI version's DealService.
"""
import uuid
from datetime import date
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError, PermissionDenied

from apps.crm.models import Deal, Stage, DealStageHistory
from apps.crm.tasks import notify_deal_stage_changed


class DealService:
    def __init__(self, organization_id: uuid.UUID):
        self.organization_id = organization_id

    def get_deal_or_404(self, deal_id: uuid.UUID) -> Deal:
        deal = get_object_or_404(Deal, id=deal_id)
        if deal.organization_id != self.organization_id:
            # Deliberately 404, not 403 — don't reveal that the object exists
            # in another tenant.
            from django.http import Http404
            raise Http404
        return deal

    @transaction.atomic
    def create_deal(self, validated_data: dict) -> Deal:
        return Deal.objects.create(
            organization_id=self.organization_id, **validated_data
        )

    @transaction.atomic
    def update_deal(self, deal_id: uuid.UUID, validated_data: dict) -> Deal:
        deal = self.get_deal_or_404(deal_id)
        if deal.is_closed:
            raise ValidationError("A closed deal cannot be edited")
        for field, value in validated_data.items():
            setattr(deal, field, value)
        deal.save()
        return deal

    @transaction.atomic
    def move_stage(self, deal_id: uuid.UUID, new_stage_id: uuid.UUID, actor_id: uuid.UUID) -> Deal:
        deal = self.get_deal_or_404(deal_id)

        if deal.is_closed:
            raise ValidationError("Deal is already closed and cannot be moved")

        try:
            new_stage = Stage.objects.get(id=new_stage_id)
        except Stage.DoesNotExist:
            raise ValidationError("Invalid stage")

        if new_stage.pipeline_id != deal.pipeline_id:
            raise ValidationError("Stage belongs to a different pipeline")

        DealStageHistory.objects.create(
            deal=deal,
            from_stage_id=deal.stage_id,
            to_stage=new_stage,
            changed_by_id=actor_id,
        )
        deal.stage = new_stage

        # If the new stage is a won/lost stage, close the deal
        if new_stage.is_won_stage or new_stage.is_lost_stage:
            deal.closed_at = date.today()

        deal.save()

        # Fire-and-forget notification via Celery so the response stays fast
        notify_deal_stage_changed.delay(str(deal.id), str(new_stage.id))

        return deal

    def get_pipeline_board(self, pipeline_id: uuid.UUID) -> list[dict]:
        """
        Kanban view: each stage with its deal count and total value.
        Done as a single aggregate query so it stays fast even with
        thousands of deals.
        """
        from django.db.models import Count, Sum, Q

        stages = (
            Stage.objects.filter(pipeline_id=pipeline_id)
            .annotate(
                deal_count=Count(
                    "deals", filter=Q(deals__organization_id=self.organization_id, deals__is_deleted=False)
                ),
                total_amount=Sum(
                    "deals__amount",
                    filter=Q(deals__organization_id=self.organization_id, deals__is_deleted=False),
                ),
            )
            .order_by("order")
            .values("id", "name", "order", "deal_count", "total_amount")
        )
        return [
            {**s, "total_amount": s["total_amount"] or 0} for s in stages
        ]
