"""
Tests for the business rules that matter most: tenant isolation and the
closed-deal lock. These were also verified live end-to-end (login, create,
move stage, attempt edit) against a real Postgres + Redis + Celery stack
during development — this suite makes that regression-proof.

Run: python manage.py test
"""
import uuid
from datetime import date
from rest_framework.test import APITestCase
from rest_framework import status

from apps.organizations.models import Organization, User
from apps.crm.models import Pipeline, Stage, Deal


class DealBusinessRulesTests(APITestCase):
    def setUp(self):
        self.org_a = Organization.objects.create(name="Acme", slug="acme-test")
        self.org_b = Organization.objects.create(name="Beta", slug="beta-test")

        self.user_a = User.objects.create_user(
            email="a@acme.test", password="pass12345",
            organization=self.org_a, full_name="A User", role=User.Role.OWNER,
        )
        self.user_b = User.objects.create_user(
            email="b@beta.test", password="pass12345",
            organization=self.org_b, full_name="B User", role=User.Role.OWNER,
        )

        self.pipeline = Pipeline.objects.create(organization=self.org_a, name="Sales")
        self.stage_lead = Stage.objects.create(pipeline=self.pipeline, name="Lead", order=1)
        self.stage_won = Stage.objects.create(
            pipeline=self.pipeline, name="Won", order=2, is_won_stage=True
        )

        self.deal = Deal.objects.create(
            organization=self.org_a, title="Test Deal", amount=1000,
            pipeline=self.pipeline, stage=self.stage_lead,
        )

    def _auth(self, user):
        from rest_framework_simplejwt.tokens import RefreshToken
        token = RefreshToken.for_user(user)
        token["org"] = str(user.organization_id)
        token["role"] = user.role
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.access_token}")

    def test_tenant_b_cannot_read_tenant_a_deal(self):
        """Cross-tenant reads must 404, never leak existence via 403."""
        self._auth(self.user_b)
        response = self.client.get(f"/api/v1/deals/{self.deal.id}/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_tenant_b_list_is_empty(self):
        """Tenant B's deal list must never include tenant A's deals."""
        self._auth(self.user_b)
        response = self.client.get("/api/v1/deals/")
        self.assertEqual(response.data, [])

    def test_closed_deal_cannot_be_edited(self):
        self.deal.closed_at = date.today()
        self.deal.save()
        self._auth(self.user_a)
        response = self.client.patch(
            f"/api/v1/deals/{self.deal.id}/", {"title": "New Title"}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_moving_to_won_stage_closes_deal(self):
        self._auth(self.user_a)
        response = self.client.post(
            f"/api/v1/deals/{self.deal.id}/move-stage/",
            {"stage_id": str(self.stage_won.id)}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.deal.refresh_from_db()
        self.assertIsNotNone(self.deal.closed_at)

    def test_cannot_move_stage_of_already_closed_deal(self):
        self.deal.closed_at = date.today()
        self.deal.save()
        self._auth(self.user_a)
        response = self.client.post(
            f"/api/v1/deals/{self.deal.id}/move-stage/",
            {"stage_id": str(self.stage_won.id)}, format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
