#Overview of the ops_notifications module
# loads token if needed 
# builds a Gmail API client 
# creates an EmailMessage object
# base64 encodes the email message
# sends the email using the Gmail API

#Included helpers funcs (they call transaction.on_commit(...) so emails sends after the database changes)

# queue_enrollment_confirmation(student)
# queue_waitlist_confirmation(waitlisted_student)
# queue_waitlist_drop_confirmation(waitlisted_student)
# queue_drop_confirmation(student)


import base64
import datetime
import logging
from email.message import EmailMessage
from email.utils import formataddr

import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured
from django.db import transaction
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

logger = logging.getLogger(__name__)

# Scopes the mentors@berkeley.edu credentials are authorized for.
GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
# Full calendar scope (not just calendar.events) is required to CREATE calendars
# and manage sharing rules for the auto-provisioned per-course calendars.
CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar"]
GOOGLE_SCOPES = GMAIL_SCOPES + CALENDAR_SCOPES
GOOGLE_TOKEN_URI = "https://oauth2.googleapis.com/token"


def get_google_credentials():
    """Build OAuth2 credentials for the mentors@berkeley.edu Google account from
    environment-backed settings. Shared by both the Gmail and Calendar clients.

    No file I/O and no interactive browser flow.
    """
    client_id = getattr(settings, "CSM_GOOGLE_GMAIL_CLIENT_ID", None)
    client_secret = getattr(settings, "CSM_GOOGLE_GMAIL_CLIENT_SECRET", None)
    refresh_token = getattr(settings, "CSM_GOOGLE_GMAIL_REFRESH_TOKEN", None)

    if not (client_id and client_secret and refresh_token):
        raise ImproperlyConfigured(
            "Google API access requires CSM_GOOGLE_GMAIL_CLIENT_ID, "
            "CSM_GOOGLE_GMAIL_CLIENT_SECRET, and "
            "CSM_GOOGLE_GMAIL_REFRESH_TOKEN to be set."
        )

    access_token, expires_in = _get_access_token(
        client_id=client_id,
        client_secret=client_secret,
        refresh_token=refresh_token,
    )
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        client_id=client_id,
        client_secret=client_secret,
        token_uri=GOOGLE_TOKEN_URI,
        scopes=GOOGLE_SCOPES,
    )
    creds.expiry = datetime.datetime.utcnow() + datetime.timedelta(
        seconds=expires_in
    )
    return creds


class GoogleGmailSender:
    """ Wrapper for the Gmail API."""

    def __init__(self, sender_email=None, sender_name=None):
        self.sender_email = sender_email or getattr(
            settings, "CSM_GMAIL_SENDER_EMAIL", "mentors@berkeley.edu"
        )
        # Display name shown in the recipient's inbox (e.g. "Mentors Departmental
        # <mentors@berkeley.edu>"). Falls back to the bare address if unset.
        self.sender_name = sender_name or getattr(
            settings, "CSM_GMAIL_SENDER_NAME", "Mentors Departmental"
        )
    ## Function to send an email.
    def send_message(self, to_email, subject, body):
        service = build("gmail", "v1", credentials=self._get_credentials())

        message = EmailMessage()
        message.set_content(body)
        message["To"] = to_email
        message["From"] = formataddr((self.sender_name, self.sender_email))
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return (
            service.users()
            .messages()
            .send(userId="me", body={"raw": encoded_message})
            .execute()
        )

    ## Delegates to the shared module-level credential builder.
    def _get_credentials(self):
        return get_google_credentials()


def queue_enrollment_confirmation(student):
    """Send an enrollment email after the DB transaction succeeds."""
    _queue_email(
        to_email=student.user.email,
        subject=f"Enrollment Confirmation for {student.course.name}",
        body=(
            f"Hi {student.name or 'there'},\n\n"
            f"This email confirms that you have successfully enrolled in a {student.course.title} section. Here are your section details: \n\n"
            f"Section: {student.section.day_time or 'TBD'}\n"
            f"Mentor: {student.section.mentor.name or student.section.mentor.user.email}\n\n"
            "You can view your section details, resources, and additional support in CSM web."
            " We look forward to supporting your academic success!\n"
        ),
    )
    _queue_coordinator_email(
        student.course,
        subject=f"Enrollment notice for {student.course.name}",
        body=(
            f"{student.name or student.user.email} has enrolled in "
            f"{student.course.title}.\n\n"
            f"Student email: {student.user.email}\n"
            f"Section: {student.section.day_time or 'TBD'}\n"
            f"Mentor: {student.section.mentor.name or student.section.mentor.user.email}\n"
        ),
    )

def queue_waitlist_confirmation(waitlisted_student):
    """Send a waitlist email after the DB transaction succeeds."""
    _queue_email(
        to_email=waitlisted_student.user.email,
        subject=f"Waitlist Confirmation for {waitlisted_student.course.name}",
        body=(
            f"Hi {waitlisted_student.name or 'there'},\n\n"
            f"Thank you for enrolling into a {waitlisted_student.course.title} section, "
            f"but the section is currently full, and you are waitlisted.\n\n"
            "We will email you if your enrollment status changes. You can view available "
            "sections, resources, and additional support in CSM web.\n"
        ),
    )
    _queue_coordinator_email(
        waitlisted_student.course,
        subject=f"Waitlist notice for {waitlisted_student.course.name}",
        body=(
            f"{waitlisted_student.name or waitlisted_student.user.email} has joined "
            f"the waitlist for {waitlisted_student.course.title}.\n\n"
            f"Student email: {waitlisted_student.user.email}\n"
            f"Section: {waitlisted_student.section.day_time or 'TBD'}\n"
            f"Mentor: "
            f"{waitlisted_student.section.mentor.name or waitlisted_student.section.mentor.user.email}\n"
        ),
    )


def queue_waitlist_drop_confirmation(waitlisted_student):
    """Send a waitlist-drop email after the DB transaction succeeds."""
    _queue_email(
        to_email=waitlisted_student.user.email,
        subject=f"Waitlist Drop Confirmation for {waitlisted_student.course.name}",
        body=(
            f"Hi {waitlisted_student.name or 'there'},\n\n"
            f"This confirms that you have been removed from the waitlist for "
            f"{waitlisted_student.course.title}.\n\n"
            "You can check CSM web for any available next steps.\n"
        ),
    )
    _queue_coordinator_email(
        waitlisted_student.course,
        subject=f"Waitlist drop notice for {waitlisted_student.course.name}",
        body=(
            f"{waitlisted_student.name or waitlisted_student.user.email} has been "
            f"removed from the waitlist for {waitlisted_student.course.title}.\n\n"
            f"Student email: {waitlisted_student.user.email}\n"
            f"Section: {waitlisted_student.section.day_time or 'TBD'}\n"
            f"Mentor: "
            f"{waitlisted_student.section.mentor.name or waitlisted_student.section.mentor.user.email}\n"
        ),
    )


def queue_drop_confirmation(student):
    """Send a section-drop email after the DB transaction succeeds."""
    _queue_email(
        to_email=student.user.email,
        subject=f"Drop confirmation for {student.course.name}",
        body=(
            f"Hi {student.name or 'there'},\n\n"
            f"This email confirms that you have been dropped from a "
            f"{student.course.title} section.\n\n"
            "If you believe this was an error or have any questions, please don't hesitate to contact us.\n"
        ),
    )
    _queue_coordinator_email(
        student.course,
        subject=f"Drop notice for {student.course.name}",
        body=(
            f"{student.name or student.user.email} has dropped "
            f"{student.course.title}.\n\n"
            f"Student email: {student.user.email}\n"
            f"Section: {student.section.day_time or 'TBD'}\n"
            f"Mentor: {student.section.mentor.name or student.section.mentor.user.email}\n"
        ),
    )


def _queue_coordinator_email(course, subject, body):
    for email in _coordinator_emails_for_course(course):
        _queue_email(email, subject, body)


def _coordinator_emails_for_course(course):
    return list(
        course.coordinator_set.exclude(user__email="")
        .select_related("user")
        .values_list("user__email", flat=True)
        .distinct()
    )


def _queue_email(to_email, subject, body):
    if not to_email:
        logger.warning("Skipping notification with blank recipient")
        return

    if not getattr(settings, "CSM_NOTIFICATIONS_ENABLED", False):
        return

    def send_after_commit():
        try:
            GoogleGmailSender().send_message(to_email, subject, body)
        except (HttpError, OSError, KeyError, ValueError) as error:
            logger.exception("Failed to send notification to %s: %s", to_email, error)

    transaction.on_commit(send_after_commit)


def _get_access_token(client_id, client_secret, refresh_token):
    response = requests.post(
        GOOGLE_TOKEN_URI,
        data={
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret,
        },
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    return data["access_token"], data["expires_in"]
