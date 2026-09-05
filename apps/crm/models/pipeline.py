from django.db import models
from apps.core.models import BaseModel


class Pipeline(BaseModel):
    """
    A sales process (e.g. 'Direct Sales' or 'Renewals'). An organization can
    run several pipelines in parallel. Tenant-scoped manually (not TenantModel)
    since it has no soft-delete need — pipelines are structural, not transactional.
    """

    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE,
        related_name="pipelines", db_index=True,
    )
    name = models.CharField(max_length=150)
    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "pipelines"

    def __str__(self):
        return self.name


class Stage(BaseModel):
    """
    Stages inside a Pipeline (e.g. Lead -> Qualified -> Proposal -> Won/Lost).
    `order` drives the kanban column ordering in the UI.
    """

    pipeline = models.ForeignKey(
        Pipeline, on_delete=models.CASCADE, related_name="stages", db_index=True
    )
    name = models.CharField(max_length=100)
    order = models.IntegerField()
    win_probability = models.IntegerField(default=0)  # % chance of closing, for forecasting
    is_won_stage = models.BooleanField(default=False)
    is_lost_stage = models.BooleanField(default=False)

    class Meta:
        db_table = "stages"
        ordering = ["order"]

    def __str__(self):
        return f"{self.pipeline.name} / {self.name}"
