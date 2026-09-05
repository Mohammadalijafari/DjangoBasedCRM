from rest_framework.routers import DefaultRouter
from apps.crm.views import DealViewSet, ContactViewSet, CompanyViewSet

router = DefaultRouter()
router.register("deals", DealViewSet, basename="deal")
router.register("contacts", ContactViewSet, basename="contact")
router.register("companies", CompanyViewSet, basename="company")

urlpatterns = router.urls
