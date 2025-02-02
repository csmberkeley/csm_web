import os
from io import BytesIO

from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, UnidentifiedImageError
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.parsers import FormParser, MultiPartParser
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
@parser_classes([MultiPartParser, FormParser])
def user_update(request, pk):
    """
    Update user profile. Only accessible by Coordinators and the user themselves.
    """
    # Get user
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Check permissions
    if request.user == user:
        pass
    elif not user_editable(request.user):
        raise PermissionDenied("You do not have permission to edit this profile")

    # Check image file
    if "file" in request.FILES:
        file, err_msg = validate_image(request.FILES["file"])
        if not file:
            return Response(
                {"error": err_msg},
                status=status.HTTP_400_BAD_REQUEST,
            )

    # Check fields
    serializer = UserSerializer(user, data=request.data, partial=True)
    if not serializer.is_valid():
        print(serializer.errors)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    with transaction.atomic():
        if "file" in request.FILES:
            user.profile_image.save(file.name, file)
        serializer.save()
    # print({**serializer.data, "profileImage": user.profile_image})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def user_info(request):
    """
    Get user info for request user
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


ALLOWED_TYPES = ["JPEG", "PNG", "JPG"]
MAX_FILE_SIZE_MB = 5  # File limit
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
TARGET_FILE_SIZE_MB = 2
TARGET_FILE_SIZE_BYTES = TARGET_FILE_SIZE_MB * 1024 * 1024
PROFILE_IMAGE_SIZE = (400, 400)  # Fixed width and height for profile images


def validate_image(image_file):
    """Validates a given image file and returns the processed file and an error message"""

    # Check file size
    image_file.seek(0, os.SEEK_END)
    file_size = image_file.tell()
    # reset file pointer
    image_file.seek(0)

    if file_size > MAX_FILE_SIZE_BYTES:
        return None, "Image size exceeds maximum allowed size of 5MB."

    try:
        # Validate extension before opening
        extension = image_file.name.rsplit(".", 1)[-1].upper()
        if extension not in ALLOWED_TYPES:
            return (
                None,
                f"Invalid image type: {extension}. Allowed types are: {ALLOWED_TYPES}.",
            )

        # Open and validate the image
        image = Image.open(image_file)
        image.verify()  # Check for corrupt files
        image = Image.open(image_file)  # reopen since verify closes

        # Validate type
        validate_image_type(image, ALLOWED_TYPES)

        img_format = image.format
        if not img_format:
            return None, "Uploaded file is not a valid image."

        # resize to less than specified width and height while preserving ratio
        # different from image = image.size(PROFILE_IMAGE_SIZE, Image.LANCZOS)
        image.thumbnail(PROFILE_IMAGE_SIZE, Image.LANCZOS)  # pylint: disable=no-member

        if file_size > TARGET_FILE_SIZE_BYTES:
            file = compress_image(image, TARGET_FILE_SIZE_BYTES, img_format)
        else:
            buffer = BytesIO()
            if img_format in ["JPEG", "JPG"]:
                image.save(buffer, format=img_format)
            else:
                image.save(buffer, format="PNG", optimze=True)
            buffer.seek(0)
            file = ContentFile(buffer.read(), name=image_file.name)

        return file, None

    except UnidentifiedImageError:
        return None, "Uploaded file is not a valid image."
    except ValueError as e:
        return None, str(e)


# Validation Helper Functions
def validate_image_type(image, allowed_types):
    """
    Validates the image type
    """
    if image.format not in allowed_types:
        raise ValueError(
            f"Invalid image type: {image.format}. Allowed types are: {allowed_types}."
        )


# not very efficient but way to compress image until it meets the file target size.
def compress_image(image, target_size_bytes, img_format):
    """Compress the image until it's smaller than target_size_bytes."""
    buffer = BytesIO()
    quality = 95  # start with high quality
    while True:
        buffer.seek(0)
        if img_format in ["JPEG", "JPG"]:
            image.save(buffer, format=img_format, quality=quality)
        else:
            image.save(buffer, format="PNG", optimze=True)
        if buffer.tell() <= target_size_bytes or quality <= 50:
            break
        quality -= 5  # decrease quality to reduce file size
    buffer.seek(0)
    return buffer
