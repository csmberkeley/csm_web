from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from scheduler.serializers import UserSerializer

from ..models import Coordinator, Mentor, Student, User
from .utils import viewset_with


class UserViewSet(*viewset_with("list")):
    serializer_class = None
    queryset = User.objects.all()

    def list(self, request):
        """
        Lists the emails of all users in the system. Only accessible by coordinators and superusers.
        """
        if not (
            request.user.is_superuser
            or Coordinator.objects.filter(user=request.user).exists()
        ):
            raise PermissionDenied(
                "Only coordinators and superusers may view the user email list"
            )
        return Response(self.queryset.order_by("email").values_list("email", flat=True))


def user_editable(user):
    """
    Returns True if the user is allowed to edit their profile
    """
    coordinator_courses = Coordinator.objects.filter(user=user).values_list(
        "course", flat=True
    )
    if Coordinator.objects.filter(user=user, course__in=coordinator_courses).exists():
        return True
    return False


def has_permission(request_user, target_user):
    """
    Returns True if the user has permission to access or edit the target user's profile
    """

    if request_user.is_superuser:
        return True
    if request_user == target_user:
        return True

    # if the target user is a mentor, return True
    if Mentor.objects.filter(user=target_user).exists():
        return True

    # if requestor is a student, get all the sections they are in
    # if the target user is a student in any of those sections, return True
    if Student.objects.filter(user=request_user).exists():
        if Student.objects.filter(user=target_user).exists():
            request_user_sections = Student.objects.filter(
                user=request_user
            ).values_list("section", flat=True)
            target_user_sections = Student.objects.filter(user=target_user).values_list(
                "section", flat=True
            )
            if set(request_user_sections) & set(target_user_sections):
                return True

    # if requestor is a mentor, get all the courses they mentor
    # if the target user is a student or mentor in any of those courses, return True
    if Mentor.objects.filter(user=request_user).exists():
        mentor_courses = Mentor.objects.filter(user=request_user).values_list(
            "course", flat=True
        )

        if Student.objects.filter(user=target_user, course__in=mentor_courses).exists():
            return True

    # if requestor is a coordinator, get all the courses they coordinate
    # if the target user is a student or mentor in any of those courses, return True
    if Coordinator.objects.filter(user=request_user).exists():
        coordinator_courses = Coordinator.objects.filter(user=request_user).values_list(
            "course", flat=True
        )
        if Student.objects.filter(
            user=target_user, course__in=coordinator_courses
        ).exists():
            return True
        if Coordinator.objects.filter(
            user=target_user, course__in=coordinator_courses
        ).exists():
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
    return Response({**serializer.data, "isEditable": user_editable(request.user)})


@api_view(["PUT"])
def user_update(request, pk):
    """
    Update user profile. Only accessible by Coordinators and the user themselves.
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if request.user == user:
        pass
    elif not user_editable(request.user):
        raise PermissionDenied("You do not have permission to edit this profile")

    serializer = UserSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def user_info(request):
    """
    Get user info for request user
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["POST"])
def upload_image(request):
    """
    Uploads an image to the aws s3 bucket
    """

    if "file" not in request.FILES:
        return Response(
            {"error": "No file was uploaded"}, status=status.HTTP_400_BAD_REQUEST
        )
    image = request.FILES["file"]

    user = request.user

    user.profile_image.save(image.name, image)

    return Response(
        {"message": "File uploaded successfully"}, status=status.HTTP_200_OK
    )
