import json
from io import BytesIO

from django.core.files.base import ContentFile
from django.core.files.uploadhandler import FileUploadHandler, StopUpload
from django.db import IntegrityError, transaction
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


@api_view(["GET"])
def user_retrieve(request, pk):
    """
    Retrieve user profile. Only accessible by superusers and the user themselves.
    """
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"error": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    if not has_permission(request.user, user):
        raise PermissionDenied("You do not have permission to access this profile")

    serializer = UserSerializer(user)
    return Response(
        {**serializer.data, "isEditable": user_editable(request.user, user)}
    )


@api_view(["PUT"])
@parser_classes([MultiPartParser, FormParser])
def user_update(request, pk):
    """
    Update user profile. Only accessible by Coordinators and the user themselves.
    """
    # Check file size
    image_handler = ProfileImageHandler(request)
    request.upload_handlers.insert(0, image_handler)

    # Get user
    try:
        user = User.objects.get(pk=pk)
    except User.DoesNotExist:
        return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)

    # Check permissions
    if not user_editable(request.user, user):
        raise PermissionDenied("You do not have permission to edit this profile")

    # Check image file
    if "file" not in request.FILES and image_handler.has_aborted:
        return Response(
            {"detail": "Image size exceeds maximum allowed size of 2MB."},
            status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
        )
    if "file" in request.FILES:
        file, err_msg = validate_image(request.FILES["file"])
        if not file:
            return Response({"detail": err_msg}, status=status.HTTP_400_BAD_REQUEST)

    # Check fields
    serializer = UserSerializer(user, data=request.data, partial=True)
    if not serializer.is_valid():
        print(serializer.errors)
        return Response(
            {"detail": json.dumps(serializer.errors)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Save new user data
    try:
        with transaction.atomic():
            if "file" in request.FILES:
                user.profile_image.delete(save=True)
                user.profile_image.save(file.name, file)
            elif (
                "file" not in request.FILES and request.data["profile_image_link"] == ""
            ):
                user.profile_image.delete(save=True)
            serializer.save()
    except IntegrityError as e:
        return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["GET"])
def user_info(request):
    """
    Get user info for request user
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


def user_editable(request_user, target_user):
    """
    Returns True if the request_user is allowed to edit the target_user's profile
    """
    if request_user.is_superuser:
        return True
    if request_user == target_user:
        return True

    if Coordinator.objects.filter(user=request_user).exists():
        coordinator_courses = Coordinator.objects.filter(user=request_user).values_list(
            "course", flat=True
        )
        print(coordinator_courses)
        if Student.objects.filter(
            user=target_user, course__in=coordinator_courses
        ).exists():
            return True
        if Mentor.objects.filter(
            user=target_user, course__in=coordinator_courses
        ).exists():
            return True
        if Coordinator.objects.filter(
            user=target_user, course__in=coordinator_courses
        ).exists():
            return True
    return False


def has_permission(request_user, target_user):
    """
    Returns True if the user has permission to access the target user's profile
    """

    # If the request_user can edit the target_user's profile, return True
    # This includes superusers, if the request_user is the target_user, or
    # if the request_user is a coordinator of a course the target_user is in
    if user_editable(request_user, target_user):
        return True

    # If the target user is a mentor, return True
    if Mentor.objects.filter(user=target_user).exists():
        return True

    ### For future use for students to contact other students in their section
    # If requestor is a student, get all the sections they are in
    # If the target user is a student in any of those sections, return True
    # if Student.objects.filter(user=request_user).exists():
    #     if Student.objects.filter(user=target_user).exists():
    #         request_user_sections = Student.objects.filter(
    #             user=request_user
    #         ).values_list("section", flat=True)
    #         target_user_sections = Student.objects.filter(user=target_user).values_list(
    #             "section", flat=True
    #         )
    #         if set(request_user_sections) & set(target_user_sections):
    #             return True

    # If requestor is a mentor, get all the sections they mentor
    # If the target user is a student in any of those sections, return True
    if Mentor.objects.filter(user=request_user).exists():
        mentor_sections = Mentor.objects.filter(user=request_user).values_list(
            "section", flat=True
        )

        if Student.objects.filter(
            user=target_user, section__in=mentor_sections
        ).exists():
            return True

    return False


# Constants for image validation
ALLOWED_TYPES = ["JPEG", "JPG", "PNG"]
MAX_FILE_SIZE_MB = 2  # File limit
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
TARGET_FILE_SIZE_MB = 2
TARGET_FILE_SIZE_BYTES = TARGET_FILE_SIZE_MB * 1024 * 1024
PROFILE_IMAGE_SIZE = (400, 400)  # Fixed width and height for profile images


class ProfileImageHandler(FileUploadHandler):
    chunk_size = MAX_FILE_SIZE_BYTES  # For performance, divisible by 4 and <2 GiB

    def __init__(self, request):
        super().__init__(request)
        self.has_aborted = False

    def receive_data_chunk(self, raw_data, start):
        if start > MAX_FILE_SIZE_BYTES:
            self.has_aborted = True
            raise StopUpload(connection_reset=True)
        return raw_data

    def file_complete(self, file_size):
        return None


def validate_image(image_file):
    """Validates a given image file and returns the processed file and an error message"""

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
