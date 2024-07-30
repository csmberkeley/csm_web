from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import UserSerializer

from ..models import Coordinator, Mentor, Student, User
from .utils import viewset_with

# can create pytest to test this


class UserViewSet(*viewset_with("list")):
    serializer_class = None
    queryset = User.objects.all()

    def list(self, request):
        """
        Lists the emails of all users in the system. Only accessible by coordinators and superusers.
        """
        if not (
            # request.user.is_superuser or
            Coordinator.objects.filter(user=request.user).exists()
        ):
            raise PermissionDenied(
                "Only coordinators and superusers may view the user email list"
            )
        return Response(self.queryset.order_by("email").values_list("email", flat=True))


def has_permission(request_user, target_user):
    """
    Returns True if the user has permission to access or edit the target user's profile
    """
    # Does not account for users who are both mentors and students of different courses
    # need separation of concerns:
    # coordinators/mentor should only have coordinator/mentor access for their course
    # Check if request_user is a mentor
    if Mentor.objects.filter(user=request_user).exists():
        mentor_courses = Mentor.objects.filter(user=request_user).values_list(
            "course", flat=True
        )

        if Student.objects.filter(user=target_user, course__in=mentor_courses).exists():
            return True
        if Mentor.objects.filter(user=target_user, course__in=mentor_courses).exists():
            return True

    # Check if request_user is a student in the same course as target_user
    # Students in the same section can see each other
    if (
        Student.objects.filter(user=request_user).exists()
        and Student.objects.filter(user=target_user).exists()
    ):
        request_user_courses = Student.objects.filter(user=request_user).values_list(
            "course", flat=True
        )
        target_user_courses = Student.objects.filter(user=target_user).values_list(
            "course", flat=True
        )

        if set(request_user_courses) & set(target_user_courses):
            return True

    # Coordinator access
    if Coordinator.objects.filter(
        user=request_user
    ).exists():  # or if request_user.is_superuser
        return True

    # Request user accessing their own profile
    if request_user == target_user:
        return True

    return False


@api_view(["GET"])
def user_retrieve(request, pk):
    """
    Retrieve user profile. Only accessible by superusers and the user themselves.
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if not has_permission(request.user, user):
        raise PermissionDenied("You do not have permission to access this profile")

    serializer = UserSerializer(user)
    return Response(serializer.data)


@api_view(["PUT"])
def user_update(request, pk):
    """
    Update user profile. Only accessible by Coordinators and the user themselves.
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if not (
        (request.user == user) or Coordinator.objects.filter(user=request.user).exists()
    ):
        raise PermissionDenied("You do not have permission to edit this profile")

    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def user_info(request):
    """
    Get user info for request user
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)
