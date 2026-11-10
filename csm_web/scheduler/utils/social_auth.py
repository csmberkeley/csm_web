def keep_edited_names(details, user=None, **_kwargs):
    """
    Social auth pipeline step that stops `user_details` from replacing edited names at login.

    Only users without a first name (e.g. ghost profiles) are filled in from Google.
    Checking each name separately would restore a last name the user removed on their profile.
    """
    if user and user.first_name:
        return {
            "details": {
                key: value
                for key, value in details.items()
                if key not in ("first_name", "last_name")
            }
        }
    return None
