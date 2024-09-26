from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response

from ..models import Section, WaitlistedStudent
from ..serializers import WaitlistedStudentSerializer
from .utils import log_str, logger


class WaitlistedStudentViewSet(viewsets.GenericViewSet):
    serializer_class = WaitlistedStudentSerializer

    @action(detail=True, methods=["post"])
    def add(self, request, pk=None):
        """
        Add a new waitlist student. Similar to add student in Section
        """
        section = Section.objects.get(pk=pk)
        if not request.user.can_enroll_in_course(section.mentor.course):
            logger.warning(
                "<Enrollment:Failure> User %s was unable to enroll in Waitlist for"
                " Section %s because they are already involved in this course",
                log_str(request.user),
                log_str(section),
            )
            raise PermissionDenied(
                "You are already either mentoring for this course or enrolled in a"
                " section, or the course is closed for enrollment",
                status.HTTP_422_UNPROCESSABLE_ENTITY,
            )

        if section.current_waitlistedstudent_count >= section.waitlist_capacity:
            logger.warning(
                "<Enrollment:Failure> User %s was unable to enroll in Waitlist for"
                " Section %s because it was full",
                log_str(request.user),
                log_str(section),
            )
            raise PermissionDenied(
                "There is no space available in this section", status.HTTP_423_LOCKED
            )

        waitliststudent_queryset = request.user.waitlistedstudent_set.filter(
            active=True, course=section.mentor.course, section=section.id
        )

        waitliststudent_queryset_all = request.user.waitlistedstudent_set.filter(
            active=True, course=section.mentor.course
        )

        if waitliststudent_queryset.count() == 1:
            logger.warning(
                "<Enrollment:Failure> User %s was unable to enroll in Waitlist for"
                " Section %s because user is already enrolled in the waitlist for this"
                " section",
                log_str(request.user),
                log_str(section),
            )
            raise PermissionDenied(
                "You are already waitlisted in this section", status.HTTP_423_LOCKED
            )

        if waitliststudent_queryset_all.count() >= section.mentor.course.max_waitlist:
            logger.warning(
                "<Enrollment:Failure> User %s was unable to enroll in Waitlist for"
                " Section %s because user is already enrolled in more than %s waitlist"
                " sections",
                log_str(request.user),
                log_str(section),
                log_str(section.mentor.course.max_waitlist),
            )
            raise PermissionDenied(
                "You are waitlisted in too many sections", status.HTTP_423_LOCKED
            )

        waitlistedstudent = WaitlistedStudent.objects.create(
            user=request.user, section=section, course=section.mentor.course
        )

        waitlistedstudent.save()
        logger.info(
            "<Enrollment:Success> User %s enrolled into Waitlist for Section %s",
            log_str(request.user),
            log_str(section),
        )
        return Response(status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["patch"])
    def add_from_waitlist(self, request, pk=None):
        """
        Add a student to a section off the waitlist. Will remove from all
        other waitlists as well
        """
        waitlisted_student = WaitlistedStudent.objects.get(pk=pk)
        user = waitlisted_student.user
        print(user)
        # TODOLATER make sure that whoever calls this function has the rights to add

        # TODOLATER maybe move this to section so that do not need to add student from here
        # section_view = SectionViewSet()
        # request.user = user
        # section_view._student_add(request, waitlisted_student.section)
        waitlist_set = WaitlistedStudent.objects.filter(
            user=user, active=True, course=waitlisted_student.course
        )
        for waitlist in waitlist_set:
            waitlist.active = False
            waitlist.save()

        logger.info(
            "<Enrollment:Success> User %s removed from all Waitlists for Course %s",
            log_str(user),
            log_str(waitlisted_student.course),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=True, methods=["patch"])
    def drop(self, request, pk=None):
        """
        Drop a student off the waitlist
        """
        waitlisted_student = WaitlistedStudent.objects.get(pk=pk)

        is_coordinator = waitlisted_student.course.coordinator_set.filter(
            user=request.user
        ).exists()
        if waitlisted_student.user != request.user and not is_coordinator:
            # Students can drop themselves, and Coordinators can drop students from their course
            # Mentors CANNOT drop their own students, or anyone else for that matter
            raise PermissionDenied("You do not have permission to add this student")

        waitlisted_student.active = False

        waitlisted_student.save()
        logger.info("<Drop> User %s Waitlisted Section", log_str(request.user))
        return Response(status=status.HTTP_204_NO_CONTENT)
