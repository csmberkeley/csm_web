import pytest
import os
import base64
from email.parser import BytesParser

from scheduler.email.email_utils import _email_send_message
from scheduler.email.email_mocks import MOCK_GMAIL_ENV, MockCredentials, mock_build, MockHttpError
from unittest.mock import patch


@pytest.mark.parametrize("subject", ["test_subject", "[CSM] IMPORTANT"])
@pytest.mark.parametrize("body", ["test_body", "Welcome!"])
@pytest.mark.parametrize("to_emails", ["test@email.com", ["test@email.com"], ["test@email.com", "example@email.com"]])
@pytest.mark.parametrize("cc_emails", ["test2@email.com", ["test2@email.com"], ["test2@email.com", "example2@email.com"]])
@pytest.mark.parametrize("bcc_emails", ["test3@email.com", ["test3@email.com"], ["test3@email.com", "example3@email.com"]])
@patch("scheduler.email.email_utils.Credentials", MockCredentials)
@patch("scheduler.email.email_utils.build", mock_build)
@patch("scheduler.email.email_utils.HttpError", MockHttpError)
@patch.dict(os.environ, MOCK_GMAIL_ENV)
def test_send_email(subject, body, to_emails, cc_emails, bcc_emails):
    encoded_message = _email_send_message(subject, body, to_emails, cc_emails, bcc_emails)

    if type(to_emails) == list:
        to_emails = ", ".join(to_emails)
    if type(cc_emails) == list:
        cc_emails = ", ".join(cc_emails)
    if type(bcc_emails) == list:
        bcc_emails = ", ".join(bcc_emails)
    body += "\n"

    b64_message = encoded_message["payload"]["body"]["data"]["raw"]
    message = BytesParser().parsebytes(base64.b64decode(b64_message))

    assert message["To"] == to_emails
    assert message["Cc"] == cc_emails
    assert message["Bcc"] == bcc_emails
    assert message["Subject"] == subject
    assert message.get_payload() == body
