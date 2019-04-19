from oauth2client import file, client, tools
from googleapiclient.discovery import build
from httplib2 import Http

SCOPES = "https://www.googleapis.com/auth/calendar"


def gcal_api_authenticate():
    """Google Calendar Authentication. Returns the service object to be used
    for making calls to the api."""
    # token.json stores the user's access and refresh tokens. It is created
    # automatically when the authorization flow completes for the first time.

    store = file.Storage("token.json")
    creds = store.get()
    if not creds or creds.invalid:
        flow = client.flow_from_clientsecrets("secrets/credentials.json", SCOPES)
        creds = tools.run_flow(flow, store)
    service = build("calendar", "v3", http=creds.authorize(Http()))
    return service
