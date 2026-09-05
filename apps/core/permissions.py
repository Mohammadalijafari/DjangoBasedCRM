"""
Two concerns live here, mirroring the FastAPI version's api/deps.py:

1. Tenant isolation — a user must never see another organization's data.
   Enforced both as a queryset filter (IsTenantMember.filter_queryset helper
   used in viewsets) and as an object-level permission check.

2. RBAC — role-based access control for write/delete operations.
"""
from rest_framework.permissions import BasePermission


class IsTenantMember(BasePermission):
    """Baseline permission: must be authenticated and active."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.is_active
        )

    def has_object_permission(self, request, view, obj):
        # Critical tenant-isolation check: never allow cross-org access,
        # even if the object's primary key was guessed/enumerated.
        return obj.organization_id == request.user.organization_id


class HasRole(BasePermission):
    """
    Factory-style permission for RBAC:
        permission_classes = [IsTenantMember, HasRole.roles("admin", "owner")]
    """

    allowed_roles: tuple[str, ...] = ()

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role in self.allowed_roles
        )

    @classmethod
    def roles(cls, *allowed_roles: str):
        return type("HasRoleScoped", (cls,), {"allowed_roles": allowed_roles})
