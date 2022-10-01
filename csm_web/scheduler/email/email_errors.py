from googleapiclient.errors import HttpError


class EmailFormattingError(Exception):
    """When provided email information is not sufficient"""


class NoEmailError(Exception):
    """When given instances of parents of user class have no email"""


class EmailAuthError(Exception):
    """When the given token.json does not work for authentication"""


def email_error_handling(email_fn):
    def wrapper(*args):
        logger = args[-1]
        args = args[:-1]
        try:
            email_fn(*args)
            logger.info(
                f"<Email:Success> Email sent"
            )
        except NoEmailError:
            logger.info(
                f"<Email:Failure> Email address not found"
            )
        except EmailFormattingError:
            logger.info(
                f"<Email:Failure> Email has not been formatted correctly for sending"
            )
        except EmailAuthError:
            logger.info(
                f"<Email:Failure> Cannot log into CSM email"
            )
        except HttpError:
            logger.info(
                f"<Email:Failure> Email failed to send"
            )
    return wrapper
