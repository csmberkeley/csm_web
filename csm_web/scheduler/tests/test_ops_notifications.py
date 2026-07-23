import base64
from email import policy
from email import message_from_bytes
from types import SimpleNamespace

from django.test import override_settings

from scheduler.notifications import ops_notifications as ops


@override_settings(CSM_NOTIFICATIONS_ENABLED=True)
def test_queue_enrollment_confirmation_sends_after_commit(monkeypatch):
    sent = []
    callbacks = []

    ## Mock the GoogleGmailSender class to capture sent messages.
    class FakeSender:
        def send_message(self, to_email, subject, body):
            sent.append(
                {
                    "to_email": to_email,
                    "subject": subject,
                    "body": body,
                }
            )
    ## set the GoogleGmailSender class to the fake sender
    monkeypatch.setattr(ops, "GoogleGmailSender", FakeSender)
    monkeypatch.setattr(ops.transaction, "on_commit", callbacks.append)

    #store the fake email 
    ops.queue_enrollment_confirmation(_fake_student())

    # nothing should be sent yet
    assert sent == []

    #pretend database commited run the callback (send student email)
    callbacks[0]()
    callbacks[1]()

    assert sent == [
        {
            "to_email": "student@berkeley.edu",
            "subject": "Enrollment Confirmation for CSM61A",
            "body": (
                "Hi Grace Student,\n\n"
                "This email confirms that you have successfully enrolled in a "
                "CSM 61A Mentoring section. Here are your section details: \n\n"
                "Section: Monday 10 AM\n"
                "Mentor: Ada Mentor\n\n"
                "You can view your section details, resources, and additional"
                " support in CSM web. We look forward to supporting your academic"
                " success!\n"
            ),
        },
        {
            "to_email": "coord@berkeley.edu",
            "subject": "Enrollment notice for CSM61A",
            "body": (
                "Grace Student has enrolled in CSM 61A Mentoring.\n\n"
                "Student email: student@berkeley.edu\n"
                "Section: Monday 10 AM\n"
                "Mentor: Ada Mentor\n"
            ),
        },
    ]


@override_settings(CSM_NOTIFICATIONS_ENABLED=True)
def test_waitlist_notifications_build_expected_subjects(monkeypatch):
    sent = []

    class FakeSender:
        def send_message(self, to_email, subject, body):
            sent.append((to_email, subject, body))

    monkeypatch.setattr(ops, "GoogleGmailSender", FakeSender)
    monkeypatch.setattr(ops.transaction, "on_commit", lambda callback: callback())

    waitlisted_student = _fake_student()

    ops.queue_waitlist_confirmation(waitlisted_student)
    ops.queue_waitlist_drop_confirmation(waitlisted_student)

    assert sent[0][0] == "student@berkeley.edu"
    assert sent[0][1] == "Waitlist Confirmation for CSM61A"
    assert "you are waitlisted" in sent[0][2]
    assert sent[1][0] == "coord@berkeley.edu"
    assert sent[1][1] == "Waitlist notice for CSM61A"
    assert "has joined the waitlist" in sent[1][2]
    assert sent[2][0] == "student@berkeley.edu"
    assert sent[2][1] == "Waitlist Drop Confirmation for CSM61A"
    assert "removed from the waitlist" in sent[2][2]
    assert sent[3][0] == "coord@berkeley.edu"
    assert sent[3][1] == "Waitlist drop notice for CSM61A"
    assert "removed from the waitlist" in sent[3][2]


@override_settings(CSM_NOTIFICATIONS_ENABLED=True)
def test_queue_drop_confirmation_builds_drop_email(monkeypatch):
    sent = []

    class FakeSender:
        def send_message(self, to_email, subject, body):
            sent.append((to_email, subject, body))

    monkeypatch.setattr(ops, "GoogleGmailSender", FakeSender)
    monkeypatch.setattr(ops.transaction, "on_commit", lambda callback: callback())

    ops.queue_drop_confirmation(_fake_student())

    assert sent[0] == (
        "student@berkeley.edu",
        "Drop confirmation for CSM61A",
        (
            "Hi Grace Student,\n\n"
            "This email confirms that you have been dropped from a "
            "CSM 61A Mentoring section.\n\n"
            "If you believe this was an error or have any questions, please"
            " don't hesitate to contact us.\n"
        ),
    )
    assert sent[1] == (
        "coord@berkeley.edu",
        "Drop notice for CSM61A",
        (
            "Grace Student has dropped CSM 61A Mentoring.\n\n"
            "Student email: student@berkeley.edu\n"
            "Section: Monday 10 AM\n"
            "Mentor: Ada Mentor\n"
        ),
    )


@override_settings(CSM_NOTIFICATIONS_ENABLED=False)
def test_queue_email_is_noop_when_notifications_disabled(monkeypatch):
    sent = []

    class FakeSender:
        def send_message(self, to_email, subject, body):
            sent.append((to_email, subject, body))

    monkeypatch.setattr(ops, "GoogleGmailSender", FakeSender)
    monkeypatch.setattr(ops.transaction, "on_commit", lambda callback: callback())

    ops.queue_drop_confirmation(_fake_student())

    assert sent == []


def test_google_gmail_sender_builds_and_sends_raw_message(monkeypatch):
    captured = {}

    class FakeMessages:
        def send(self, userId, body):
            captured["user_id"] = userId
            captured["body"] = body
            return self

        def execute(self):
            return {"id": "message-id"}

    class FakeUsers:
        def messages(self):
            return FakeMessages()

    class FakeService:
        def users(self):
            return FakeUsers()

    def fake_build(service_name, version, credentials):
        captured["service_name"] = service_name
        captured["version"] = version
        captured["credentials"] = credentials
        return FakeService()

    fake_credentials = object()
    sender = ops.GoogleGmailSender(sender_email="mentors@berkeley.edu")
    monkeypatch.setattr(sender, "_get_credentials", lambda: fake_credentials)
    monkeypatch.setattr(ops, "build", fake_build)

    result = sender.send_message(
        to_email="student@berkeley.edu",
        subject="Test subject",
        body="Hello from CSM web.",
    )

    assert result == {"id": "message-id"}
    assert captured["service_name"] == "gmail"
    assert captured["version"] == "v1"
    assert captured["credentials"] is fake_credentials
    assert captured["user_id"] == "me"

    raw_message = base64.urlsafe_b64decode(captured["body"]["raw"])
    message = message_from_bytes(raw_message, policy=policy.default)

    assert message["To"] == "student@berkeley.edu"
    assert message["From"] == "Mentors Departmental <mentors@berkeley.edu>"
    assert message["Subject"] == "Test subject"
    assert message.get_content().strip() == "Hello from CSM web."


def _fake_student():
    mentor_user = SimpleNamespace(email="mentor@berkeley.edu")
    mentor = SimpleNamespace(name="Ada Mentor", user=mentor_user)
    section = SimpleNamespace(day_time="Monday 10 AM", mentor=mentor)
    course = SimpleNamespace(
        name="CSM61A",
        title="CSM 61A Mentoring",
        coordinator_set=FakeCoordinatorSet(["coord@berkeley.edu"]),
    )
    user = SimpleNamespace(email="student@berkeley.edu")
    return SimpleNamespace(
        name="Grace Student",
        user=user,
        course=course,
        section=section,
    )


class FakeCoordinatorSet:
    def __init__(self, emails):
        self.emails = emails

    def exclude(self, **_kwargs):
        return self

    def select_related(self, *_args):
        return self

    def values_list(self, *_args, **_kwargs):
        return self

    def distinct(self):
        return self

    def __iter__(self):
        return iter(self.emails)
