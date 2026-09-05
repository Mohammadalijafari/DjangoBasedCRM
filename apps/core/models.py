"""
Abstract base models shared by every domain model.
This is where multi-tenancy and soft-delete get baked in once,
instead of being repeated (and possibly forgotten) on every model.
"""
import uuid
from django.db import models
from django.utils import timezone


class TenantManager(models.Manager):
    """
    Default manager: automatically hides soft-deleted rows.
    Tenant filtering itself happens in the view/queryset layer (see
    apps/core/permissions.py) because the manager has no request context —
    but this keeps soft-delete invisible everywhere by default.
    """

    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)


class AllObjectsManager(models.Manager):
    """Escape hatch for admin/reporting that needs deleted rows too."""

    def get_queryset(self):
        return super().get_queryset()


class BaseModel(models.Model):
    """UUID PK + timestamps. No tenant/soft-delete — for org-independent tables."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class TenantModel(BaseModel):
    """
    Base for every CRM domain model (Contact, Company, Deal, ...).
    Adds organization scoping and soft delete, matching the FastAPI version's
    TenantMixin + SoftDeleteMixin.
    """

    organization = models.ForeignKey(
        "organizations.Organization", on_delete=models.CASCADE, db_index=True
    )
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = TenantManager()
    all_objects = AllObjectsManager()

    class Meta:
        abstract = True

    def soft_delete(self):
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=["is_deleted", "deleted_at"])