from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone

from rest_framework import generics, permissions, status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import Attendance, Course, Profile, Section, Override
from .serializers import (
    AttendanceSerializer,
    CourseSerializer,
    ProfileSerializer,
    VerboseProfileSerializer,
    UserProfileSerializer,
    SectionSerializer,
    OverrideSerializer,
)
from .permissions import (
    is_leader,
    IsLeader,
    IsLeaderOrReadOnly,
    IsReadIfOwner,
    IsOwner,
    DestroyIsOwner,
)

VERBOSE = "verbose"
USERINFO = "userinfo"


@api_view(http_method_names=["POST"])
def enroll(request, pk):
    section = get_object_or_404(Section, pk=pk)

    if request.user.profile_set.filter(course=section.course, active=True).count() > 0:
        # Note: This denies anyone who is already associated with a course
        # (student, JM, SM, Coord) from enrolling in a course section.
        raise PermissionDenied(
            detail={
                "short_code": "already_enrolled",
                "message": "User is already enrolled in this course",
            },
            code=status.HTTP_403_FORBIDDEN,
        )

    if (
        timezone.now() < section.course.enrollment_start
        or timezone.now() > section.course.enrollment_end
    ):
        raise PermissionDenied(
            detail={
                "short_code": "course_closed",
                "message": "Course is not open for enrollment",
            },
            code=status.HTTP_403_FORBIDDEN,
        )

    with transaction.atomic():
        # We reload the section object for atomicity. Even though we never actually
        # update the section, any profile addition must first acquire a lock on the
        # desired section. This allows us to assume that current_student_count is
        # correct.
        section = Section.objects.select_for_update().get(pk=section.pk)

        if section.current_student_count >= section.capacity:
            raise PermissionDenied(
                detail={
                    "short_code": "section_full",
                    "message": "Section is at full capacity",
                },
                code=status.HTTP_403_FORBIDDEN,
            )

        profile = Profile(
            course=section.course,
            section=section,
            user=request.user,
            role=Profile.STUDENT,
            leader=section.mentor,
        )
        profile.save()

    serialized_profile = ProfileSerializer(profile).data
    return Response(serialized_profile)


# REST Framework API Views


class CourseList(generics.ListAPIView):
    """
    Responds to GET /courses with a list of all existing courses.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    list_permission_source = None


class CourseDetail(generics.RetrieveAPIView):
    """
    Responds to GET /courses/$NAME/ with the courses object associated with the given slug name.
    """

    queryset = Course.objects.all()
    serializer_class = CourseSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_object(self):
        return self.queryset.get(name__iexact=self.kwargs["name"])


class CourseSectionList(generics.ListAPIView):
    """
    Responds to GET /courses/$NAME/sections with a list of all sections associated with the course
    of the given slug name.
    """

    queryset = Course.objects.all()
    serializer_class = SectionSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly,)
    list_permission_source = None

    def get_queryset(self):
        return Section.objects.filter(course__name__iexact=self.kwargs["name"])


class UserProfileList(generics.ListAPIView):
    """
    Returns a list of profiles associated with the currently logged in user.
    """

    serializer_class = ProfileSerializer

    # There are no restrictions on any user viewing their own Profiles
    list_permission_source = None

    def get_queryset(self):
        if self.request.user.is_authenticated:
            return Profile.objects.filter(user=self.request.user, active=True)
        else:
            raise PermissionDenied


class UserProfileDetail(generics.RetrieveAPIView):
    """
    Returns details for the profile with profile_id = $ID, selectively gated by leadership,
    i.e. only the leader or user associated with the profile should be able to retrieve this.
    """

    queryset = Profile.objects.filter(active=True)
    permission_classes = (IsReadIfOwner | IsLeader,)

    def get_serializer_class(self):
        if self.request.query_params.get(VERBOSE, "false") == "true":
            return VerboseProfileSerializer
        elif self.request.query_params.get(USERINFO, "false") == "true":
            return UserProfileSerializer
        else:
            return ProfileSerializer


class DeleteProfile(generics.DestroyAPIView):
    # TODO this looks like it should really have a permission class...

    permission_classes = (DestroyIsOwner,)

    def destroy(self, request, *args, **kwargs):
        profile = get_object_or_404(Profile, pk=self.kwargs["pk"])
        self.check_object_permissions(request, profile)
        if not profile.active:
            raise PermissionDenied(
                "This profile ({}) has been deactivated".format(profile)
            )
        profile.active = False
        profile.save()

        return Response({}, status=status.HTTP_204_NO_CONTENT)


class UserProfileAttendance(generics.ListAPIView):
    """
    GET: Returns attendances for profile with profile_id = $ID, Gated by leadership
    """

    serializer_class = AttendanceSerializer
    permission_classes = ((IsOwner | IsLeader),)

    def get_queryset(self):
        profile = get_object_or_404(Profile, pk=self.kwargs["pk"])
        return Attendance.objects.filter(attendee=profile.pk)

    @property
    def list_permission_source(self):
        # Only the Owner or Leader of this Profile should be able to view its attendance
        return get_object_or_404(Profile, pk=self.kwargs["pk"])


class SectionDetail(generics.RetrieveAPIView):
    """
    Responds to GET /sections/$ID with the corresponding section.
    """

    queryset = Section.objects.all()
    serializer_class = SectionSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj


class CreateOverrideDetail(generics.CreateAPIView):
    """
    Responds to POST /overrides with the corresponding section.
    """

    queryset = Override.objects.all()
    serializer_class = OverrideSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)


class OverrideDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Override.objects.all()
    serializer_class = OverrideSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeaderOrReadOnly)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj


class CreateAttendanceDetail(generics.CreateAPIView):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeader)

    def perform_create(self, serializer):
        # Deny attendance creation if not leader of section
        profile = serializer.validated_data["attendee"]
        section = profile.section
        if not is_leader(self.request.user, section):
            raise PermissionDenied(
                "You are not allowed to create Attendances for that section"
            )
        elif not profile.active:  # Deny attendances for deactivated profiles
            raise PermissionDenied(
                "This profile ({}) has been deactivated".format(profile)
            )
        else:
            serializer.save()


class AttendanceDetail(generics.RetrieveUpdateDestroyAPIView):
    queryset = Attendance.objects.all()
    serializer_class = AttendanceSerializer
    permission_classes = (permissions.IsAuthenticatedOrReadOnly, IsLeader)

    def get_object(self):
        obj = get_object_or_404(self.get_queryset(), pk=self.kwargs["pk"])
        self.check_object_permissions(self.request, obj)
        return obj
