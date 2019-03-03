from datetime import timedelta, date
import logging
from django.db.models import signals
from django.db import transaction
from django.dispatch import receiver
from django.contrib.auth.models import User as AuthUser
import scheduler.models as models
from eventlog.events import EventGroup

### ATTENDANCE GENERATION

WEEKDAY_MAP = {
    number: pair[0] for number, pair in enumerate(models.Spacetime.DAY_OF_WEEK_CHOICES)
}


### LOGGING
e = EventGroup()


@receiver(signals.post_save, sender=models.Profile)
def handle_profile_post_save(sender, **kwargs):
    """
    Performs actions to be taken upon a student dropping. At present, these are:
    (1) If the student dropped from a CS70 section, drop them from the corresponding
        2nd section as well.
    (2) If the student is enrolled in a CS70 section, enroll them in the corresponding
        2nd section as well.
    """
    profile = kwargs["instance"]
    raw = kwargs["raw"]
    created = kwargs["created"]
    if not raw and profile.role == models.Profile.STUDENT:
        if profile.course.name == "CS70":
            with transaction.atomic():
                if not profile.active:
                    # drop from corresponding 70 section
                    e.info(
                        "Recognized attempt to drop {} (profile id {}) from dual CS70 section".format(
                            profile, profile.id
                        ),
                        initiator="CS70 Dual-Drop",
                    )
                    other_profiles = models.Profile.objects.filter(
                        user=profile.user,
                        active=True,  # important to prevent infinite loop
                        course__name="CS70",
                    ).update(active=False)
                elif created:
                    # enroll in corresponding 70 section
                    e.info(
                        "Recognized attempt to enroll {} (profile id {}) in dual CS70 section".format(
                            profile, profile.id
                        ),
                        initiator="CS70 Dual-Enroll",
                    )
                    if (
                        models.Profile.objects.filter(
                            user=profile.user,
                            course__name="CS70",
                            leader=profile.leader,
                        ).count()
                        == 1
                    ):
                        other_mentor_profile = (
                            models.Profile.objects.filter(
                                user=profile.leader.user, course__name="CS70"
                            )
                            .exclude(id=profile.leader.id)
                            .first()
                        )
                        if other_mentor_profile:
                            other_section = other_mentor_profile.section
                            models.Profile.objects.create(
                                user=profile.user,
                                course=models.Course.objects.get(name="CS70"),
                                leader=profile.leader,
                                section=other_section,
                                role=models.Profile.STUDENT,
                            )


@receiver(signals.post_save, sender=models.Profile)
def generate_attendances(sender, **kwargs):
    """
    Creates attendance objects for the upcoming week for a student when they join a section.
    """
    profile = kwargs["instance"]
    raw = kwargs["raw"]
    created = kwargs["created"]
    if (
        not raw
        and created
        and profile.role == models.Profile.STUDENT
        and profile.section is not None
    ):
        current_date = date.today()
        while (
            WEEKDAY_MAP[current_date.weekday()]
            != profile.section.default_spacetime.day_of_week
        ):
            current_date += timedelta(days=1)
        models.Attendance.objects.create(
            attendee=profile,
            section=profile.section,
            week_start=current_date - timedelta(days=current_date.weekday()),
        )


@receiver(signals.post_save, sender=models.Section)
def log_section_post_create(sender, **kwargs):
    section = kwargs["instance"]
    created = kwargs["created"]
    raw = kwargs["raw"]
    if not raw:
        if created:
            e.info(
                "Created new section {}, id = {}".format(section, section.id),
                initiator="Section",
            )
        else:
            e.info(
                "Updated section {}, id = {}".format(section, section.id),
                initiator="Section",
            )


@receiver(signals.post_save, sender=models.Attendance)
def log_attendance_post_create(sender, **kwargs):
    attendance = kwargs["instance"]
    created = kwargs["created"]
    raw = kwargs["raw"]
    if not raw:
        if created:
            e.info(
                "Created new attendance {} for section {}".format(
                    attendance, attendance.section
                ),
                initiator="Attendance",
            )
        else:
            e.info(
                "Updated attendance {} for section {}".format(
                    attendance, attendance.section
                ),
                initiator="Attendance",
            )


@receiver(signals.pre_save, sender=models.Profile)
def log_profile_pre_create(sender, **kwargs):
    profile = kwargs["instance"]
    raw = kwargs["raw"]
    if not raw:
        e.info(
            "Starting profile save of {} (email {}, active={})".format(
                profile, profile.user.email, profile.active
            ),
            initiator="Pre-Profile",
        )


@receiver(signals.post_save, sender=models.Profile)
def log_student_post_create(sender, **kwargs):
    profile = kwargs["instance"]
    created = kwargs["created"]
    raw = kwargs["raw"]
    if not raw and profile.role == models.Profile.STUDENT:
        if profile.active:
            e.info(
                "Finished enrolling {} (email {}, id {})".format(
                    profile, profile.user.email, profile.id
                ),
                initiator="Post-Enroll",
            )
        else:
            e.info(
                "Finished dropping {} (email {}, id {})".format(
                    profile, profile.user.email, profile.id
                ),
                initiator="Post-Enroll",
            )


@receiver(signals.post_save, sender=models.Override)
def log_overide_post_create(sender, **kwargs):
    override = kwargs["instance"]
    created = kwargs["created"]
    raw = kwargs["raw"]
    if not raw:
        e.info("Finished save of {}".format(override), initiator="Override Post-Save")


logger = logging.getLogger("scheduler.signals")

DEBUG = logging.DEBUG
INFO = logging.INFO


def _log_pre_save(sender, level, kwargs):
    """
    Logs the state of an object before being saved in the database at the specified level.
    """
    inst = kwargs["instance"]
    raw = kwargs["raw"]
    if not raw:
        logger.log(
            level,
            "Pre-save %s instance: %r",
            sender.__name__,
            inst.__dict__,
            exc_info=True,
        )


def _log_post_save(sender, level, kwargs):
    """
    Logs the updating or creation of an object in the database at the specified level.
    """
    inst = kwargs["instance"]
    created = kwargs["created"]
    raw = kwargs["raw"]
    if not raw:
        if created:
            logger.log(
                level,
                "Created %s instance: %r",
                sender.__name__,
                inst.__dict__,
                exc_info=True,
            )
        else:
            logger.log(
                level,
                "Post-update %s instance: %r",
                sender.__name__,
                inst.__dict__,
                exc_info=True,
            )


def _log_pre_delete(sender, level, kwargs):
    inst = kwargs["instance"]
    logger.log(
        level, "Deleted %s instance: %r", sender.__name__, inst.__dict__, exc_info=True
    )


# CREATION


@receiver(signals.post_save, sender=AuthUser)
def log_create_auth_user(sender, **kwargs):
    _log_post_save(sender, DEBUG, kwargs)


@receiver(signals.post_save, sender=models.Profile)
def log_create_profile(sender, **kwargs):
    _log_post_save(sender, INFO, kwargs)


@receiver(signals.post_save, sender=models.User)
def log_create_user(sender, **kwargs):
    _log_post_save(sender, INFO, kwargs)


@receiver(signals.post_save, sender=models.Course)
def log_create_course(sender, **kwargs):
    _log_post_save(sender, DEBUG, kwargs)


@receiver(signals.post_save, sender=models.Override)
def log_create_override(sender, **kwargs):
    _log_post_save(sender, DEBUG, kwargs)


@receiver(signals.post_save, sender=models.Section)
def log_create_section(sender, **kwargs):
    _log_post_save(sender, DEBUG, kwargs)


# UPDATE


@receiver(signals.pre_save, sender=models.Attendance)
def log_update_attendance(sender, **kwargs):
    _log_pre_save(sender, INFO, kwargs)


# DELETION


@receiver(signals.pre_delete, sender=models.User)
def log_delete_user(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)


@receiver(signals.pre_delete, sender=models.Attendance)
def log_delete_attendance(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)


@receiver(signals.pre_delete, sender=models.Course)
def log_delete_course(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)


@receiver(signals.pre_delete, sender=models.Profile)
def log_delete_profile(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)


@receiver(signals.pre_delete, sender=models.Section)
def log_delete_section(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)


@receiver(signals.pre_delete, sender=models.Spacetime)
def log_delete_spacetime(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)


@receiver(signals.pre_delete, sender=models.Override)
def log_delete_override(sender, **kwargs):
    _log_pre_delete(sender, INFO, kwargs)
