from django.db import models
from django.contrib.postgres.fields import ArrayField
from apps.core.models import TenantModel


class Contact(TenantModel):
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    job_title = models.CharField(max_length=150, blank=True, null=True)
    company = models.ForeignKey(
        "crm.Company", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="contacts",
    )
    owner = models.ForeignKey(
        "organizations.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="owned_contacts",
    )
    tags = ArrayField(models.CharField(max_length=50), default=list, blank=True)
    lead_source = models.CharField(max_length=100, blank=True, null=True)
    notes_text = models.TextField(blank=True, null=True)
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "contacts"
        indexes = [
            models.Index(fields=["organization", "email"], name="ix_contacts_org_email"),
        ]

    def __str__(self):
        return self.full_name

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
