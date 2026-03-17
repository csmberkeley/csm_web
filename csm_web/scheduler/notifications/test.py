import base64
from email.message import EmailMessage

import google.auth
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Scopes define what permissions you're requesting
SCOPES = ["https://www.googleapis.com/auth/gmail.compose"]

def get_credentials():
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)

        with open("token.json", "w") as token:
            token.write(creds.to_json())

    return creds

def gmail_send():
  """Create and send an email.
   Print the returned email's message and id.
   Returns: Email object, including email id and message meta data.

  """
  creds = get_credentials()

  try:
    # create gmail api client
    service = build("gmail", "v1", credentials=creds)

    message = EmailMessage()

    message.set_content("This is automated draft mail")

    message["To"] = "alex05sim@berkeley.edu"
    message["From"] = "mentors@berkeley.edu"
    message["Subject"] = "Hi Alex Sim"

    # encoded message
    encoded_message = base64.urlsafe_b64encode(message.as_bytes()).decode()

    # pylint: disable=E1101
    sent = (
            service.users()
            .messages()
            .send(userId="me", body={"raw": encoded_message})
            .execute()
        )

    print(f'Email sent! Message id: {sent["id"]}')

  except HttpError as error:
    print(f"An error occurred: {error}")
    sent = None

  return sent


if __name__ == "__main__":
  gmail_send()