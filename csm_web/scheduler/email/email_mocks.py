import os

MOCK_GMAIL_ENV = {
    "GMAIL_TOKEN": "token",
    "GMAIL_REFRESH_TOKEN": "refresh_token",
    "GMAIL_TOKEN_URI": "token_uri",
    "GMAIL_CLIENT_ID": "client_id",
    "GMAIL_CLIENT_SECRET": "client_secret",
    "GMAIL_EXPIRY": "expiry",
}


class MockCredentials:
    """Mock credentials class modeled after https://google-auth.readthedocs.io/en/stable/reference/google.oauth2.credentials.html"""

    def __init__(
        self,
        token,
        refresh_token=None,
        id_token=None,
        token_uri=None,
        client_id=None,
        client_secret=None,
        scopes=None,
        default_scopes=None,
        quota_project_id=None,
        expiry=None,
        rapt_token=None,
    ):
        pass

    def from_authorized_user_file(filename, scopes=None):
        if not os.path.exists(filename):
            raise FileNotFoundError(filename)

    def from_authorized_user_info(info, scopes=None):
        pass


def mock_build(
    serviceName,
    version,
    http=None,
    discoveryServiceUrl=None,
    developerKey=None,
    model=None,
    requestBuilder=None,
    credentials=None,
    cache_discovery=True,
    cache=None,
    client_options=None,
    adc_cert_path=None,
    adc_key_path=None,
    num_retries=1,
):
    """Mock build function modeled after https://googleapis.github.io/google-api-python-client/docs/epy/index.html"""
    return MockGmailAPI()


class MockGmailAPI:
    """Mock Gmail API class modeled after https://developers.google.com/resources/api-libraries/documentation/gmail/v1/python/latest/index.html"""

    class MockObjects:
        def email_message(id, body=""):
            return {  # An email message.
                # The internal message creation timestamp (epoch ms), which determines ordering in the inbox. For normal SMTP-received email, this represents the time the message was originally accepted by Google, which is more reliable than the Date header. However, for API-migrated mail, it can be configured by client to be based on the Date header.
                "internalDate": "A String",
                "historyId": "A String",  # The ID of the last history record that modified this message.
                "payload": {  # A single MIME message part. # The parsed email structure in the message parts.
                    "body": {  # The body of a single MIME message part. # The message part body for this part, which may be empty for container MIME message parts.
                        "data": body,  # The body data of a MIME message part as a base64url encoded string. May be empty for MIME container types that have no message body or when the body data is sent as a separate attachment. An attachment ID is present if the body data is contained in a separate attachment.
                        # When present, contains the ID of an external attachment that can be retrieved in a separate messages.attachments.get request. When not present, the entire content of the message part body is contained in the data field.
                        "attachmentId": "A String",
                        "size": 42,  # Number of bytes for the message part data (encoding notwithstanding).
                    },
                    "mimeType": "A String",  # The MIME type of the message part.
                    "partId": "A String",  # The immutable ID of the message part.
                    # The filename of the attachment. Only present if this message part represents an attachment.
                    "filename": "A String",
                    "headers": [  # List of headers on this message part. For the top-level message part, representing the entire message payload, it will contain the standard RFC 2822 email headers such as To, From, and Subject.
                        {
                            "name": "A String",  # The name of the header before the : separator. For example, To.
                            # The value of the header after the : separator. For example, someuser@example.com.
                            "value": "A String",
                        },
                    ],
                    "parts": [  # The child MIME message parts of this part. This only applies to container MIME message parts, for example multipart/*. For non- container MIME message part types, such as text/plain, this field is empty. For more information, see RFC 1521.
                        # Object with schema name: MessagePart
                    ],
                },
                "snippet": "A String",  # A short part of the message text.
                # The entire email message in an RFC 2822 formatted and base64url encoded string. Returned in messages.get and drafts.get responses when the format=RAW parameter is supplied.
                "raw": "A String",
                "sizeEstimate": 42,  # Estimated size in bytes of the message.
                # The ID of the thread the message belongs to. To add a message or draft to a thread, the following criteria must be met:
                "threadId": "A String",
                # - The requested threadId must be specified on the Message or Draft.Message you supply with your request.
                # - The References and In-Reply-To headers must be set in compliance with the RFC 2822 standard.
                # - The Subject headers must match.
                "labelIds": [  # List of IDs of labels applied to this message.
                    "A String",
                ],
                "id": id,  # The immutable ID of the message.
            }

        MOCK_LABEL = {  # Labels are used to categorize messages and threads within the user's mailbox.
            "name": "A String",  # The display name of the label.
            "messagesTotal": 42,  # The total number of messages with the label.
            "color": {  # The color to assign to the label. Color is only available for labels that have their type set to user.
                # The text color of the label, represented as hex string. This field is required in order to set the color of a label. Only the following predefined set of color values are allowed:
                "textColor": "A String",
                # #000000, #434343, #666666, #999999, #cccccc, #efefef, #f3f3f3, #ffffff, #fb4c2f, #ffad47, #fad165, #16a766, #43d692, #4a86e8, #a479e2, #f691b3, #f6c5be, #ffe6c7, #fef1d1, #b9e4d0, #c6f3de, #c9daf8, #e4d7f5, #fcdee8, #efa093, #ffd6a2, #fce8b3, #89d3b2, #a0eac9, #a4c2f4, #d0bcf1, #fbc8d9, #e66550, #ffbc6b, #fcda83, #44b984, #68dfa9, #6d9eeb, #b694e8, #f7a7c0, #cc3a21, #eaa041, #f2c960, #149e60, #3dc789, #3c78d8, #8e63ce, #e07798, #ac2b16, #cf8933, #d5ae49, #0b804b, #2a9c68, #285bac, #653e9b, #b65775, #822111, #a46a21, #aa8831, #076239, #1a764d, #1c4587, #41236d, #83334c #464646, #e7e7e7, #0d3472, #b6cff5, #0d3b44, #98d7e4, #3d188e, #e3d7ff, #711a36, #fbd3e0, #8a1c0a, #f2b2a8, #7a2e0b, #ffc8af, #7a4706, #ffdeb5, #594c05, #fbe983, #684e07, #fdedc1, #0b4f30, #b3efd3, #04502e, #a2dcc1, #c2c2c2, #4986e7, #2da2bb, #b99aff, #994a64, #f691b2, #ff7537, #ffad46, #662e37, #ebdbde, #cca6ac, #094228, #42d692, #16a765
                # The background color represented as hex string #RRGGBB (ex #000000). This field is required in order to set the color of a label. Only the following predefined set of color values are allowed:
                "backgroundColor": "A String",
                # #000000, #434343, #666666, #999999, #cccccc, #efefef, #f3f3f3, #ffffff, #fb4c2f, #ffad47, #fad165, #16a766, #43d692, #4a86e8, #a479e2, #f691b3, #f6c5be, #ffe6c7, #fef1d1, #b9e4d0, #c6f3de, #c9daf8, #e4d7f5, #fcdee8, #efa093, #ffd6a2, #fce8b3, #89d3b2, #a0eac9, #a4c2f4, #d0bcf1, #fbc8d9, #e66550, #ffbc6b, #fcda83, #44b984, #68dfa9, #6d9eeb, #b694e8, #f7a7c0, #cc3a21, #eaa041, #f2c960, #149e60, #3dc789, #3c78d8, #8e63ce, #e07798, #ac2b16, #cf8933, #d5ae49, #0b804b, #2a9c68, #285bac, #653e9b, #b65775, #822111, #a46a21, #aa8831, #076239, #1a764d, #1c4587, #41236d, #83334c #464646, #e7e7e7, #0d3472, #b6cff5, #0d3b44, #98d7e4, #3d188e, #e3d7ff, #711a36, #fbd3e0, #8a1c0a, #f2b2a8, #7a2e0b, #ffc8af, #7a4706, #ffdeb5, #594c05, #fbe983, #684e07, #fdedc1, #0b4f30, #b3efd3, #04502e, #a2dcc1, #c2c2c2, #4986e7, #2da2bb, #b99aff, #994a64, #f691b2, #ff7537, #ffad46, #662e37, #ebdbde, #cca6ac, #094228, #42d692, #16a765
            },
            "type": "A String",  # The owner type for the label. User labels are created by the user and can be modified and deleted by the user and can be applied to any message or thread. System labels are internally created and cannot be added, modified, or deleted. System labels may be able to be applied to or removed from messages and threads under some circumstances but this is not guaranteed. For example, users can apply and remove the INBOX and UNREAD labels from messages and threads, but cannot apply or remove the DRAFTS or SENT labels from messages or threads.
            "threadsUnread": 42,  # The number of unread threads with the label.
            "messagesUnread": 42,  # The number of unread messages with the label.
            # The visibility of the label in the label list in the Gmail web interface.
            "labelListVisibility": "A String",
            "threadsTotal": 42,  # The total number of threads with the label.
            # The visibility of the label in the message list in the Gmail web interface.
            "messageListVisibility": "A String",
            "id": "A String",  # The immutable ID of the label.
        }

    class UsersResource:
        """Mock users resource"""

        def __init__(self, gmail_api):
            self.gmail_api = gmail_api

        def messages(self):
            return MockGmailAPI.MessagesResource(self.gmail_api)

        def labels(self):
            return MockGmailAPI.LabelsResource(self.gmail_api)

    class MessagesResource:
        """Mock messages resource"""

        def __init__(self, gmail_api):
            self.gmail_api = gmail_api

        def modify(self, userId, id, body=None):
            class MessagesModifyRequest:
                """Mock messages modify request"""

                def __init__(self, gmail_api):
                    self.gmail_api = gmail_api

                def execute(self):
                    return self.gmail_api.messages[id]

            return MessagesModifyRequest(self.gmail_api)

        def send(self, userId, body=None, media_body=None, media_mime_type=None):
            class MessagesSendRequest:
                """Mock messages send request"""

                def __init__(self, gmail_api):
                    self.gmail_api = gmail_api

                def execute(self):
                    message = MockGmailAPI.MockObjects.email_message(
                        len(self.gmail_api.messages), body
                    )
                    self.gmail_api.messages.append(message)
                    return message

            return MessagesSendRequest(self.gmail_api)

    class LabelsResource:
        """Mock labels resource"""

        def __init__(self, gmail_api):
            self.gmail_api = gmail_api

        def create(self, userId, body=None):
            class LabelCreateRequest:
                """Mock label create request"""

                def __init__(self, gmail_api):
                    self.gmail_api = gmail_api

                def execute(self):
                    return MockGmailAPI.MockObjects.MOCK_LABEL

            return LabelCreateRequest(self.gmail_api)

        def list(self, userId):
            class LabelListRequest:
                """Mock label list request"""

                def __init__(self, gmail_api):
                    self.gmail_api = gmail_api

                def execute(self):
                    return {
                        "labels": [  # List of labels. Note that each label resource only contains an id, name, messageListVisibility, labelListVisibility, and type. The labels.get method can fetch additional label details.
                            MockGmailAPI.MockObjects.MOCK_LABEL,
                            MockGmailAPI.MockObjects.MOCK_LABEL,
                        ],
                    }

            return LabelListRequest(self.gmail_api)

    def __init__(self):
        self.messages = []

    def users(self):
        return MockGmailAPI.UsersResource(self)


class MockHttpError(Exception):
    """Mock HTTP Error for testing"""
