import csv

from django.core.management import BaseCommand
from django.db import transaction
from scheduler.models import User  # pylint: disable=E0401


class Command(BaseCommand):
    help = "Generates users with first/last names parsed from the roster CSV."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="path to the csv file")

    def handle(self, *args, **options):
        with open(options["csv_path"], "r") as csvfile:
            reader = csv.DictReader(csvfile)
            next(reader)  # eat header
            with transaction.atomic():
                for row in reader:
                    email = row["Email Address"]
                    name = row["Preferred Name"]

                    try:
                        firstname = name.split()[0]
                        lastname = name.split()[-1]
                        chunks = email.split("@")
                        if len(chunks) != 2:
                            raise Exception("Malformed email: {}".format(email))
                        if chunks[1] != "berkeley.edu":
                            raise Exception(
                                "Non-Berkeley email found: {}".format(email)
                            )
                        u, _ = User.objects.get_or_create(
                            email=email, username=chunks[0]
                        )
                        if not u.first_name or u.last_name:
                            u.first_name = firstname
                            u.last_name = lastname
                            u.save()
                    except Exception as e:
                        raise Exception(
                            f"Errored trying to enter user {email} ({name}): {e}"
                        )
