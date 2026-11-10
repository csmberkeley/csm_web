import struct
from io import BytesIO

from django.core.files.base import ContentFile
from django.db import transaction
from PIL import Image, ImageOps, UnidentifiedImageError
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import api_view, parser_classes

from .utils import viewset_with
from ..models import Coordinator, User, delete_stored_photo
from scheduler.serializers import UserProfileSerializer


class UserViewSet(*viewset_with("list")):
    serializer_class = None
    queryset = User.objects.all()

    def list(self, request):
        if not (
            request.user.is_superuser
            or Coordinator.objects.filter(user=request.user).exists()
        ):
            raise PermissionDenied(
                "Only coordinators and superusers may view the user email list"
            )
        return Response(self.queryset.order_by("email").values_list("email", flat=True))


@api_view(["GET", "PATCH"])
def userinfo(request):
    """
    Get or update user info for request user
    """
    if request.method == "PATCH":
        serializer = UserProfileSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
    else:
        serializer = UserProfileSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)


PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024
# PNGs and progressive JPEGs buffer the full image; baseline JPEGs downscale as they decode,
# but only if both sides reach four times the target size (thumbnail() requests double it)
PROFILE_PHOTO_MAX_PIXELS = 20_000_000
PROFILE_PHOTO_MAX_PIXELS_BASELINE_JPEG = 50_000_000
PROFILE_PHOTO_BASELINE_JPEG_MIN_SIDE = 1600
PROFILE_PHOTO_MAX_DIMENSIONS = (400, 400)
PROFILE_PHOTO_EXTENSIONS = {"JPEG": "jpg", "PNG": "png"}


def process_profile_photo(photo):
    """
    Validate an uploaded photo, returning it resized and without metadata,
    along with its file extension.
    """
    if photo.size > PROFILE_PHOTO_MAX_BYTES:
        raise ValidationError({"detail": "Photo must be 5 MB or smaller."})

    try:
        # without formats, Pillow runs every plugin's parser that matches the file's header
        image = Image.open(photo, formats=tuple(PROFILE_PHOTO_EXTENSIONS))
        # Pillow reports JPEGs with embedded secondary images, common on phones, as MPO
        image_format = "JPEG" if image.format == "MPO" else image.format
        # size comes from the header; check it before decoding, since Pillow only
        # raises for images far too large to decode safely here
        downscales_on_decode = (
            image_format == "JPEG"
            and not image.info.get("progressive")
            and min(image.size) >= PROFILE_PHOTO_BASELINE_JPEG_MIN_SIDE
        )
        max_pixels = (
            PROFILE_PHOTO_MAX_PIXELS_BASELINE_JPEG
            if downscales_on_decode
            else PROFILE_PHOTO_MAX_PIXELS
        )
        if image.width * image.height > max_pixels:
            raise ValidationError({"detail": "Photo dimensions are too large."})
        # palette and 1-bit images can only be resized with nearest-neighbor, which looks jagged
        if image.mode in ("1", "P"):
            image = image.convert("RGBA")
        # shrink first so the rotation below doesn't copy the full-size image
        image.thumbnail(PROFILE_PHOTO_MAX_DIMENSIONS)
        image = ImageOps.exif_transpose(image)
        # JPEG comments are otherwise carried over on save
        image.info.pop("comment", None)
        buffer = BytesIO()
        # JPEGs otherwise lose their color profile, which washes out wide-gamut phone photos
        image.save(
            buffer, format=image_format, icc_profile=image.info.get("icc_profile")
        )
    except UnidentifiedImageError as error:
        raise ValidationError({"detail": "Photo must be a JPG or PNG."}) from error
    except Image.DecompressionBombError as error:
        raise ValidationError({"detail": "Photo dimensions are too large."}) from error
    # TypeError and struct.error come from malformed EXIF data
    except (OSError, SyntaxError, ValueError, TypeError, struct.error) as error:
        raise ValidationError({"detail": "File is not a valid image."}) from error

    return ContentFile(buffer.getvalue()), PROFILE_PHOTO_EXTENSIONS[image_format]


@api_view(["POST", "DELETE"])
@parser_classes([MultiPartParser])
def userinfo_photo(request):
    """
    Upload or remove the profile photo of the request user
    """
    user = request.user

    if request.method == "POST":
        if "photo" not in request.FILES:
            raise ValidationError({"detail": "No photo was uploaded."})
        content, extension = process_profile_photo(request.FILES["photo"])
        # upload before taking the row lock, so the lock isn't held across the storage call
        user.profile_photo.save(f"photo.{extension}", content, save=False)
    else:
        user.profile_photo = ""

    try:
        with transaction.atomic():
            # lock the row so concurrent requests each clean up the photo they actually replace
            previous_photo = (
                User.objects.select_for_update()
                .values_list("profile_photo", flat=True)
                .get(pk=user.pk)
            )
            user.save(update_fields=["profile_photo"])
    except Exception:
        # nothing references the new upload, so it would otherwise stay in the public bucket
        if user.profile_photo:
            delete_stored_photo(user, user.profile_photo.name)
        raise

    if previous_photo:
        delete_stored_photo(user, previous_photo)
    return Response(UserProfileSerializer(user).data, status=status.HTTP_200_OK)
