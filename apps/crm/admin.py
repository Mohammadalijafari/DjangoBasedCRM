from django.contrib import admin
from apps.crm.models import Company, Contact, Pipeline, Stage, Deal, Activity


@admin.register(Company)
class CompanyAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "industry", "is_deleted")
    list_filter = ("organization", "is_deleted")
    search_fields = ("name", "domain")


@admin.register(Contact)
class ContactAdmin(admin.ModelAdmin):
    list_display = ("full_name", "email", "company", "organization", "is_deleted")
    list_filter = ("organization", "is_deleted")
    search_fields = ("first_name", "last_name", "email")


class StageInline(admin.TabularInline):
    model = Stage
    extra = 1


@admin.register(Pipeline)
class PipelineAdmin(admin.ModelAdmin):
    list_display = ("name", "organization", "is_default")
    inlines = [StageInline]


@admin.register(Deal)
class DealAdmin(admin.ModelAdmin):
    list_display = ("title", "organization", "stage", "amount", "owner", "closed_at")
    list_filter = ("organization", "stage", "closed_at")
    search_fields = ("title",)


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ("subject", "type", "organization", "assigned_to", "due_date", "completed")
    list_filter = ("organization", "type", "completed")
