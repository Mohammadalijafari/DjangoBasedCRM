from django.db import models
from apps.core.models import TenantModel


class Company(TenantModel):
    """A customer's company (Account) — not the org that owns the CRM."""

    SIZE_CHOICES = [
        ("1-10", "1-10"),
        ("11-50", "11-50"),
        ("51-200", "51-200"),
        ("201-500", "201-500"),
        ("500+", "500+"),
    ]

    name = models.CharField(max_length=255, db_index=True)
    domain = models.CharField(max_length=255, blank=True, null=True)
    industry = models.CharField(max_length=100, blank=True, null=True)
    size = models.CharField(max_length=50, choices=SIZE_CHOICES, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    owner = models.ForeignKey(
        "organizations.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="owned_companies",
    )
    custom_fields = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "companies"
        verbose_name_plural = "companies"

    def __str__(self):
        return self.name
