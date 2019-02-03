from datetime import timedelta
import logging
from django.db.models import signals
from django.dispatch import receiver
from django.contrib.auth.models import User as AuthUser
import scheduler.models as models

### ATTENDANCE GENERATION

WEEKDAY_MAP = {
    number: pair[0] for number, pair in enumerate(models.Spacetime.DAY_OF_WEEK_CHOICES)
}


@receiver(signals.post_save, sender=models.Profile)
def generate_attendances(sender, **kwargs):
    """
    Creates attendance objects for a student when they join a section.
    """
    profile = kwargs["instance"]
    raw = kwargs["raw"]
    if not raw and profile.role == models.Profile.STUDENT and profile.section is not None:
        # modified slightly from factories.py
        current_date = profile.course.enrollment_start.date()
        while (
            WEEKDAY_MAP[current_date.weekday()]
            != profile.section.default_spacetime.day_of_week
        ):
            current_date += timedelta(days=1)
        while current_date < profile.course.valid_until:
            models.Attendance.objects.create(
                attendee=profile,
                section=profile.section,
                week_start=current_date - timedelta(days=current_date.weekday()),
            )
            current_date += timedelta(weeks=1)
            # TODO backfill absences for late enrollees?


### LOGGING
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
