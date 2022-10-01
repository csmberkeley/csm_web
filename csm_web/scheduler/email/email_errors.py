class EmailFormattingError(Exception):
    """When provided email information is not sufficient"""


class NoEmailError(Exception):
    """When given instances of parents of user class have no email"""


class EmailAuthError(Exception):
    """When the given token.json does not work for authentication"""
