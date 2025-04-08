# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# This script is for generating token.json for authentication.
# Follow https://developers.google.com/gmail/api/quickstart/python
#   > "Authorize credentials for a desktop application"
# and place the credentials.json file in the same folder as this file.

# [START gmail_quickstart]
from __future__ import print_function

import json
import os.path

import dotenv
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/gmail.modify"]


def main():
    """Shows basic usage of the Gmail API.
    Lists the user's Gmail labels.
    """
    creds = None
    # The file token.json stores the user's access and refresh tokens, and is
    # created automatically when the authorization flow completes for the first
    # time.
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    else:  # Attempt to load from .env variables
        creds = Credentials.from_authorized_user_info(
            {
                "token": os.getenv("GMAIL_TOKEN"),
                "refresh_token": os.getenv("GMAIL_REFRESH_TOKEN"),
                "token_uri": os.getenv("GMAIL_TOKEN_URI"),
                "client_id": os.getenv("GMAIL_CLIENT_ID"),
                "client_secret": os.getenv("GMAIL_CLIENT_SECRET"),
                "scopes": SCOPES,
                "expiry": os.getenv("GMAIL_EXPIRY"),
            }
        )

    # If there are no (valid) credentials available, let the user log in.
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            flow = InstalledAppFlow.from_client_secrets_file("credentials.json", SCOPES)
            creds = flow.run_local_server(port=0)
        # Save the credentials for the next run
        creds_dict = json.loads(creds.to_json())
        dotenv_file = dotenv.find_dotenv()
        os.environ["GMAIL_TOKEN"] = creds_dict["token"]
        os.environ["GMAIL_REFRESH_TOKEN"] = creds_dict["refresh_token"]
        os.environ["GMAIL_TOKEN_URL"] = creds_dict["token_uri"]
        os.environ["GMAIL_CLIENT_ID"] = creds_dict["client_id"]
        os.environ["GMAIL_CLIENT_SECRET"] = creds_dict["client_secret"]
        os.environ["GMAIL_EXPIRY"] = creds_dict["expiry"]

        for key in (
            "GMAIL_TOKEN",
            "GMAIL_REFRESH_TOKEN",
            "GMAIL_TOKEN_URL",
            "GMAIL_CLIENT_ID",
            "GMAIL_CLIENT_SECRET",
            "GMAIL_EXPIRY",
        ):
            dotenv.set_key(dotenv_file, key, os.environ[key])

        print(
            "Please restart your environment to load the new email environment variables"
        )


if __name__ == "__main__":
    main()
