from django.db import models
from apps.core.models import TenantModel, BaseModel


class Deal(TenantModel):
    """The sales opportunity — the heart of the CRM."""

    title = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="USD")

    pipeline = models.ForeignKey(
        "crm.Pipeline", on_delete=models.PROTECT, related_name="deals", db_index=True
    )
    stage = models.ForeignKey(
        "crm.Stage", on_delete=models.PROTECT, related_name="deals", db_index=True
    )
    company = models.ForeignKey(
        "crm.Company", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="deals",
    )
    primary_contact = models.ForeignKey(
        "crm.Contact", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="deals",
    )
    owner = models.ForeignKey(
        "organizations.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="owned_deals", db_index=True,
    )
    expected_close_date = models.DateField(null=True, blank=True)
    closed_at = models.DateField(null=True, blank=True)
    lost_reason = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "deals"

    def __str__(self):
        return self.title

    @property
    def is_closed(self) -> bool:
        return self.closed_at is not None


class DealStageHistory(BaseModel):
    """
    Append-only log of every stage change a deal goes through.
    Powers reports like "average time spent per stage" and conversion rate —
    never edited or deleted, only inserted.
    """

    deal = models.ForeignKey(
        Deal, on_delete=models.CASCADE, related_name="stage_history", db_index=True
    )
    from_stage = models.ForeignKey(
        "crm.Stage", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="+",
    )
    to_stage = models.ForeignKey(
        "crm.Stage", on_delete=models.PROTECT, related_name="+"
    )
    changed_by = models.ForeignKey(
        "organizations.User", on_delete=models.SET_NULL, null=True, blank=True,
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "deal_stage_history"
        ordering = ["changed_at"]
