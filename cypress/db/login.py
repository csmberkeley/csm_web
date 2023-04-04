from django.core.management import call_command


def setup():
    call_command("createtestuser", silent=True)
