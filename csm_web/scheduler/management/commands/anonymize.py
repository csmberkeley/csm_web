from django.conf import settings
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import User


class Command(BaseCommand):
    help = "Anonymizes users that are currently in the database. This essentially just replaces the names/emails of the users with their profile IDs."

    def add_arguments(self, parser):
        parser.add_argument(
            "preserve",
            nargs="*",
            help="Leaves users with these emails untouched, e.g. the emails of the admins.",
        )

    def handle(self, *args, **options):
        if not settings.DEBUG:
            self.stderr.write("This cannot be run in production! Aborting.")
            return
        for user in User.objects.all():
            if not (options["preserve"] and user.email in options["preserve"]):
                user_pk = user.pk
                user.email = f"{user_pk}@berkeley.edu"
                user.first_name = f"{user_pk}_first_name"
                user.last_name = f"{user_pk}_last_name"
                user.save()
