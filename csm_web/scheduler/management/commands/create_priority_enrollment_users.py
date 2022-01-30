import csv
from django.core.management import BaseCommand
from django.db import transaction
from scheduler.models import User  # pylint: disable=E0401
import datetime
from django.utils.timezone import make_aware


class Command(BaseCommand):
    help = "Generates users with priority enrollment using emails parsed from a CSV."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="path to the csv file")
        parser.add_argument("priority_enrollment_date", type=str, help="date in the form 'mm-dd-yyyy hh:mm:ss'")

    def handle(self, *args, **options):
        filename = options["csv_path"]
        enrollment_date = make_aware(datetime.datetime.strptime(
            options["priority_enrollment_date"], '%m-%d-%Y %H:%M:%S'))
        with open(filename, "r") as csvfile:
            reader = csv.DictReader(csvfile)
            with transaction.atomic():
                for row in reader:
                    email = row["Email Address"]
                    try:
                        chunks = email.split("@")
                        if len(chunks) != 2:
                            raise Exception("Malformed email: {}".format(email))
                        if chunks[1] != "berkeley.edu":
                            raise Exception("Non-Berkeley email found: {}".format(email))
                        u, status = User.objects.get_or_create(
                            email=email,
                            username=chunks[0],
                        )
                        u.priority_enrollment = enrollment_date
                        u.save()
                        print(u.username, u.email, u.priority_enrollment)
                    except Exception as e:
                        raise Exception(f"Errored trying to enter user {email} : {e}")
