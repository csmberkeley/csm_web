import csv
from django.core.management import BaseCommand
from django.db import transaction, IntegrityError
from scheduler.models import User


class Command(BaseCommand):
    help = "Fills in first/last name for profiles where no name was generated oops."

    def add_arguments(self, parser):
        parser.add_argument("csv_path", type=str, help="path to the csv file")

    def handle(self, *args, **options):
        with open(options["csv_path"], "r") as csvfile:
            reader = iter(csv.reader(csvfile))
            next(reader)  # eat header
            with transaction.atomic():
                for row in reader:
                    firstname = row[1]
                    lastname = row[2]
                    email = row[3]
                    u = User.objects.filter(email=email)
                    if len(u) == 1:
                        fst = u.first()
                        if not fst.first_name or fst.last_name:
                            u.update(first_name=firstname, last_name=lastname)
                    else:
                        raise Exception(
                            "WARNING: found {} users with email {}".format(
                                len(u), email
                            )
                        )
