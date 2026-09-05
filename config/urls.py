from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from rest_framework_simplejwt.views import TokenRefreshView
from apps.organizations.auth import TenantTokenObtainPairView


def health_check(request):
    from django.conf import settings
    return JsonResponse({"status": "ok", "environment": settings.ENVIRONMENT})


urlpatterns = [
    path("admin/", admin.site.urls),
    path("health", health_check),
    path("api/v1/auth/login", TenantTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/v1/auth/refresh", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/v1/", include("apps.crm.urls")),
]
