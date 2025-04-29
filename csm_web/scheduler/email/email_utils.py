import base64
import html
import os
from email.message import EmailMessage

from django.conf import settings
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from .email_errors import (
    EmailAuthError,
    EmailFormattingError,
    NoEmailError,
    email_error_handling,
)

PROFILE_URL = "https://scheduler.csmentors.org/profile"

# Email error handling wrapper adds logger argument as last argument


@email_error_handling
def email_enroll(student):
    """Sends the corresponding mentor an email notification that the STUDENT enrolled in their section"""

    try:
        mentor = student.section.mentor
        course_title = student.course.title
        mentor_name = mentor.user.first_name + " " + mentor.user.last_name
        student_name = student.user.first_name + " " + student.user.last_name
        mentor_email = mentor.user.email
        student_email = student.user.email
    except AttributeError:
        raise NoEmailError

    if mentor.user.subscribed:
        body = _render_template("student_enroll/notif.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Student Enrolled", body, mentor_email
        )

    if student.user.subscribed:
        body = _render_template("student_enroll/confirm.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Section Enrollment Confirmation",
            body,
            student_email,
        )


# Email error handling wrapper adds logger argument as last argument


@email_error_handling
def email_swap(student):
    """Sends the corresponding mentor an email notification that the STUDENT has swapped into their section"""

    try:
        mentor = student.section.mentor
        course_title = student.course.title
        mentor_name = mentor.user.first_name + " " + mentor.user.last_name
        student_name = student.user.first_name + " " + student.user.last_name
        mentor_email = mentor.user.email
        student_email = student.user.email
    except AttributeError:
        raise NoEmailError

    if mentor.user.subscribed:
        body = _render_template("student_swap/mentor_in_notif.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Student Swapped", body, mentor_email
        )

    if student.user.subscribed:
        body = _render_template("student_swap/confirm.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Section Swap Confirmation", body, student_email
        )


# Email error handling wrapper adds logger argument as last argument


@email_error_handling
def email_student_drop(student):
    """Sends the corresponding mentor an email notification that the STUDENT dropped out of their section"""

    try:
        mentor = student.section.mentor
        course_title = student.course.title
        mentor_name = mentor.user.first_name + " " + mentor.user.last_name
        student_name = student.user.first_name + " " + student.user.last_name
        mentor_email = mentor.user.email
        student_email = student.user.email
    except AttributeError:
        raise NoEmailError

    if mentor.user.subscribed:
        body = _render_template("student_drop/notif.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Student Dropped", body, mentor_email
        )

    if student.user.subscribed:
        body = _render_template("student_drop/confirm.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Section Drop Confirmation", body, student_email
        )


# Email error handling wrapper adds logger argument as last argument


@email_error_handling
def email_coordinator_drop(student):
    """Sends the corresponding mentor and STUDENT an email notification that
    the student has been dropped out of the section by the coordinator"""

    try:
        mentor = student.section.mentor
        course_title = student.course.title
        mentor_name = mentor.user.first_name + " " + mentor.user.last_name
        student_name = student.user.first_name + " " + student.user.last_name
        mentor_email = mentor.user.email
        student_email = student.user.email
    except AttributeError:
        raise NoEmailError

    if mentor.user.subscribed:
        body = _render_template("coord_drop/mentor_notif.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Coordinator Dropped Student", body, mentor_email
        )

    if student.user.subscribed:
        body = _render_template("coord_drop/student_notif.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Student Dropped", body, student_email
        )


def _render_template(filepaths):
    if isinstance(filepaths, str):
        filepaths = [filepaths]

    body = ""
    for filepath in filepaths:
        with open(
            os.path.join(settings.BASE_DIR, "scheduler/email/email_content", filepath),
            "r",
        ) as file:
            body += file.read()

    with open(
        os.path.join(settings.BASE_DIR, "scheduler/email/email_content/signature.html"),
        "r",
    ) as file:
        body += file.read().format(PROFILE_URL=html.escape(PROFILE_URL))

    return "<html><body>" + body + "</html></body>"


def _email_send_message(subject, body, to_emails=[], cc_emails=[], bcc_emails=[]):
    """Helper function to send an email to the email addresses TO_EMAILS, CCing CC_EMAILS
    and BCCing BCC_EMAILS, with subject SUBJECT and message MESSAGE"""

    # Handle email has no recipients
    if not (to_emails or cc_emails or bcc_emails):
        raise EmailFormattingError

    # Reformat single recipient to list
    if isinstance(to_emails, list):
        to_emails = ", ".join(to_emails)
    if isinstance(cc_emails, list):
        cc_emails = ", ".join(cc_emails)
    if isinstance(bcc_emails, list):
        bcc_emails = ", ".join(bcc_emails)

    # Authenticate with token
    try:
        creds = Credentials.from_authorized_user_info(
            {
                "token": os.getenv("GMAIL_TOKEN"),
                "refresh_token": os.getenv("GMAIL_REFRESH_TOKEN"),
                "token_uri": os.getenv("GMAIL_TOKEN_URI"),
                "client_id": os.getenv("GMAIL_CLIENT_ID"),
                "client_secret": os.getenv("GMAIL_CLIENT_SECRET"),
                "scopes": ["https://www.googleapis.com/auth/gmail.modify"],
                "expiry": os.getenv("GMAIL_EXPIRY"),
            }
        )
    except:
        raise EmailAuthError

    # Build service
    service = build("gmail", "v1", credentials=creds)

    # Get or create label
    label = None
    label_name = "Automated Messages"
    labels = service.users().labels().list(userId="me").execute()

    # Get label
    for existing_label in labels["labels"]:
        if existing_label["name"] == label_name:
            label = existing_label

    # Create label
    if not label:
        label = (
            service.users()
            .labels()
            .create(
                userId="me",
                body={
                    "name": label_name,
                    "messageListVisibility": "show",
                    "labelListVisibility": "labelShow",
                },
            )
            .execute()
        )

    # Create message
    message = EmailMessage()

    message["To"] = to_emails
    message["Cc"] = cc_emails
    message["Bcc"] = bcc_emails
    message["Subject"] = subject

    message.set_content(body, "html")

    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

    create_message = {"raw": encoded_message}

    # Send message
    send_message = (
        service.users().messages().send(userId="me", body=create_message).execute()
    )

    # Add label
    send_message = (
        service.users()
        .messages()
        .modify(
            userId="me",
            id=send_message["id"],
            body={"addLabelIds": [label["id"]]},
        )
        .execute()
    )

    return send_message


@email_error_handling
def email_waitlist(waitlisted_student):
    """Sends the corresponding student an email notification that the STUDENT waitlist in their section"""

    try:
        mentor = waitlisted_student.section.mentor
        course_title = mentor.course.title
        mentor_name = mentor.user.first_name + " " + mentor.user.last_name
        student_name = (
            waitlisted_student.user.first_name + " " + waitlisted_student.user.last_name
        )
        student_email = waitlisted_student.user.email
    except AttributeError:
        raise NoEmailError

    if waitlisted_student.user.subscribed:
        body = _render_template("waitlist_enroll/confirm.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Section Waitlist Confirmation",
            body,
            student_email,
        )

@email_error_handling
def email_waitlist_drop(waitlisted_student):
    """Sends the corresponding student an email notification that they have been dropped from the waitlist"""

    try:
        mentor = waitlisted_student.section.mentor
        course_title = mentor.course.title
        mentor_name = mentor.user.first_name + " " + mentor.user.last_name
        student_name = (
            waitlisted_student.user.first_name + " " + waitlisted_student.user.last_name
        )
        student_email = waitlisted_student.user.email
    except AttributeError:
        raise NoEmailError

    if waitlisted_student.user.subscribed:
        body = _render_template("waitlist_drop/notif.html").format(
            course_title=html.escape(course_title),
            mentor_name=html.escape(mentor_name),
            student_name=html.escape(student_name),
        )
        _email_send_message(
            f"[CSM - {course_title}] Waitlist Drop Confirmation", body, student_email
        )