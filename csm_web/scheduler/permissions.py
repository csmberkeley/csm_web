from rest_framework import permissions


class IsLeader(permissions.BasePermission):
    """
    Grants permission to resource only if is leader of resource.

    Currently this is just boilerplate to illustrate how it might work.
    """

    def has_permission(self, request, view):
        return False

    def has_object_permission(self, request, view, obj):
        return False


class IsLeaderOrReadOnly(IsLeader):
    """
    Grants permission to edit resource only if is leader of resource, read-only
    otherwise.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return super().has_permission(request, view)

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return super().has_object_permission(request, view, obj)
