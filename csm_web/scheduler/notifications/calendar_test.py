import base64
from email.message import EmailMessage

import google.auth
import os
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import datetime
import json
import requests

# Scopes define what permissions you're requesting
SCOPES = ["https://www.googleapis.com/auth/calendar.events"]

creds_data = {}
with open('credentials.json', 'r') as f:
    creds_data = json.load(f)
creds_data = creds_data["installed"]


def get_access_token(client_id: str, client_secret: str, refresh_token: str) -> tuple[str, int]:
    response = requests.post("https://oauth2.googleapis.com/token", data={
        "grant_type": "refresh_token",
        "refresh_token": refresh_token,
        "client_id": client_id,
        "client_secret": client_secret,
    })
    response.raise_for_status()
    data = response.json()

    return data["access_token"], data["expires_in"]


def get_credentials():
    creds = None

    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.token, expires_in = get_access_token(
                client_id=creds_data["client_id"],
                client_secret=creds_data["client_secret"],
                refresh_token=creds.refresh_token,
            )
            creds.expiry = datetime.datetime.now() + datetime.timedelta(seconds=expires_in)
        else:
            flow = InstalledAppFlow.from_client_secrets_file(
                "credentials.json", SCOPES
            )
            creds = flow.run_local_server(port=0)

        with open("token.json", "w") as token:
            token.write(creds.to_json())

    return creds

def send_gcal_invite():
  """Create and send a gcal invite.
  """
  creds = get_credentials()

  try:
    # create gcal api client
    service = build("calendar", "v3", credentials=creds)

    event = {
        "summary": "CSM Section",
        "description": "This is an automated calendar invite.",

        # set start and end times
        "start": {
            "dateTime": "2026-04-06T10:00:00",
            "timeZone": "America/Los_Angeles",
        },
        "end": {
            "dateTime": "2026-04-06T11:00:00",
            "timeZone": "America/Los_Angeles",
        },

        # attendee emails
        "attendees": [
            {"email": "mentors@berkeley.edu"},
            {"email": "ericaliu9@gmail.com"}
        ],

        "reminders": {
            "useDefault": True,
        },
    }
    event = service.events().insert(calendarId='primary', body=event).execute()
    print ('Event created: %s' % (event.get('htmlLink')))


  except HttpError as error:
    print(f"An error occurred: {error}")
    sent = None


if __name__ == "__main__":
  send_gcal_invite()