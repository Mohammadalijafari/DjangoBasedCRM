from django.db import models
from apps.core.models import TenantModel


class Activity(TenantModel):
    """
    Activities and tasks — can be linked to a Contact and/or a Deal.
    This table's timeline is what gets shown on a contact's or deal's detail page.
    """

    class Type(models.TextChoices):
        CALL = "call", "Call"
        EMAIL = "email", "Email"
        MEETING = "meeting", "Meeting"
        TASK = "task", "Task"
        NOTE = "note", "Note"

    type = models.CharField(max_length=20, choices=Type.choices)
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)

    contact = models.ForeignKey(
        "crm.Contact", on_delete=models.CASCADE, null=True, blank=True,
        related_name="activities", db_index=True,
    )
    deal = models.ForeignKey(
        "crm.Deal", on_delete=models.CASCADE, null=True, blank=True,
        related_name="activities", db_index=True,
    )
    assigned_to = models.ForeignKey(
        "organizations.User", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="assigned_activities", db_index=True,
    )
    due_date = models.DateTimeField(null=True, blank=True)
    completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "activities"
        verbose_name_plural = "activities"

    def __str__(self):
        return self.subject
