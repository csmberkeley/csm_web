from rest_framework import permissions, mixins
from .models import Override, Attendance


def is_leader(user, obj):
    if not hasattr(obj, "leader"):
        return False
    leader = obj.leader
    while leader:
        if user == leader.user:
            return True
        else:
            leader = leader.leader
    return False


class ListPermissionMixin:
    """
    Grants permission based on a list_permission_source property.
    If list_permission_source is None OR has_object_permission passes on
    list_permission_source, then has_list_permission passes.
    """

    def has_list_permission(self, request, view):
        if (
            isinstance(view, mixins.ListModelMixin)
            and view.list_permission_source is not None
        ):
            return self.has_object_permission(
                request, view, view.list_permission_source
            )
        else:
            return True


class IsLeader(permissions.BasePermission, ListPermissionMixin):
    """
    Grants read/write permission to resource only if the logged in user is the leader of the resource.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and self.has_list_permission(request, view)
        )

    # note: has_permission is always run before has_object_permission
    def has_object_permission(self, request, view, obj):
        # Transform to linked section
        if isinstance(obj, Override) or isinstance(obj, Attendance):
            obj = obj.section

        return is_leader(request.user, obj)


class IsLeaderOrReadOnly(IsLeader):
    """
    Grants permission to edit resource only if is leader of resource, read-only
    otherwise.
    """

    def has_permission(self, request, view):
        return bool(
            request.method in permissions.SAFE_METHODS
            or super().has_permission(request, view)
        )

    def has_object_permission(self, request, view, obj):
        return bool(
            request.method in permissions.SAFE_METHODS
            or super().has_object_permission(request, view, obj)
        )


class IsReadIfOwner(permissions.BasePermission):
    """
    Grants permission to read the resource only if the requester is the user associated
    with the object.
    """

    def has_permission(self, request, view):
        return bool(
            (
                request.method in permissions.SAFE_METHODS
                and request.user
                and request.user.is_authenticated
            )
        )

    def has_object_permission(self, request, view, obj):
        return bool(
            (
                request.method in permissions.SAFE_METHODS
                and request.user
                and request.user == obj.user
            )
        )


class IsOwner(permissions.BasePermission, ListPermissionMixin):
    """
    Grants permission to read/write the resource only if the requester is the user
    associated with the object.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and self.has_list_permission(request, view)
        )

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user == obj.user)


class DestroyIsOwner(permissions.BasePermission):
    """
    Grants permission to destroy the resource only if the requester is the user
    associated with the object.
    """

    def has_object_permission(self, request, view, obj):
        return bool(request.user and request.user == obj.user)
