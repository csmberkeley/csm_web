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
import json
import logging
import os
from email.message import EmailMessage

import requests
from django.conf import settings
from django.db import transaction
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

## only need permissions to send emails
logger = logging.getLogger(__name__)

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.send"]
NOTIFICATIONS_DIR = os.path.dirname(__file__)


class GoogleGmailSender:
    """ Wrapper for the Gmail API."""

    def __init__(self, credentials_file=None, token_file=None, sender_email=None):
        self.credentials_file = credentials_file or getattr(
            settings,
            "CSM_GOOGLE_GMAIL_CREDENTIALS_FILE",
            os.path.join(NOTIFICATIONS_DIR, "credentials.json"),
        )
        self.token_file = token_file or getattr(
            settings,
            "CSM_GOOGLE_GMAIL_TOKEN_FILE",
            os.path.join(NOTIFICATIONS_DIR, "token.json"),
        )
        self.sender_email = sender_email or getattr(
            settings, "CSM_GMAIL_SENDER_EMAIL", "mentors@berkeley.edu"
        )
    ## Function to send an email.
    def send_message(self, to_email, subject, body):
        service = build("gmail", "v1", credentials=self._get_credentials())

        message = EmailMessage()
        message.set_content(body)
        message["To"] = to_email
        message["From"] = self.sender_email
        message["Subject"] = subject

        encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()
        return (
            service.users()
            .messages()
            .send(userId="me", body={"raw": encoded_message})
            .execute()
        )
    
    ## Function to get the credentials for the Gmail API.
    def _get_credentials(self):
        creds = None

        if os.path.exists(self.token_file):
            creds = Credentials.from_authorized_user_file(
                self.token_file, GMAIL_SCOPES
            )

        if creds and creds.valid:
            return creds

        if creds and creds.expired and creds.refresh_token:
            client_data = _load_installed_client_data(self.credentials_file)
            access_token, expires_in = _get_access_token(
                client_id=client_data["client_id"],
                client_secret=client_data["client_secret"],
                refresh_token=creds.refresh_token,
            )
            creds.token = access_token
            creds.expiry = datetime.datetime.utcnow() + datetime.timedelta(
                seconds=expires_in
            )
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                self.credentials_file, GMAIL_SCOPES
            )
            creds = flow.run_local_server(port=0)

        try:
            with open(self.token_file, "w", encoding="utf-8") as token:
                token.write(creds.to_json())
        except OSError as error:
            logger.warning("Could not persist refreshed Gmail token: %s", error)

        return creds


def queue_enrollment_confirmation(student):
    """Send an enrollment email after the DB transaction succeeds."""
    _queue_email(
        to_email=student.user.email,
        subject=f"Enrollment confirmed for {student.course.name}",
        body=(
            f"Hi {student.name or 'there'},\n\n"
            f"You are enrolled in {student.course.title}.\n\n"
            f"Section: {student.section.day_time or 'TBD'}\n"
            f"Mentor: {student.section.mentor.name or student.section.mentor.user.email}\n\n"
            "You can view your section details in CSM web.\n"
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
        subject=f"Waitlist confirmation for {waitlisted_student.course.name}",
        body=(
            f"Hi {waitlisted_student.name or 'there'},\n\n"
            f"You have been added to the waitlist for "
            f"{waitlisted_student.course.title}.\n\n"
            "We will email you if your enrollment status changes.\n"
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
        subject=f"Waitlist drop confirmation for {waitlisted_student.course.name}",
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
            f"This confirms that you have been dropped from "
            f"{student.course.title}.\n\n"
            "You can check CSM web for any available next steps.\n"
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


def _load_installed_client_data(credentials_file):
    with open(credentials_file, "r", encoding="utf-8") as credentials:
        return json.load(credentials)["installed"]


def _get_access_token(client_id, client_secret, refresh_token):
    response = requests.post(
        "https://oauth2.googleapis.com/token",
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
