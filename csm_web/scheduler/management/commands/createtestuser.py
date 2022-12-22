from django.core.management import BaseCommand
from scheduler.models import User


class Command(BaseCommand):
    help = "Populates database with a single test user for testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--silent", action="store_true", help="no stdout during execution"
        )

    def handle(self, *args, **options):
        demo_user = User.objects.create(
            username="demo_user",
            email="demo_user@berkeley.edu",
            first_name="Demo",
            last_name="User",
        )
        demo_user.is_staff = True
        demo_user.is_superuser = True
        demo_user.set_password("pass")
        demo_user.save()
        if "silent" not in options or not options["silent"]:
            print("Created demo user with username 'demo_user' and password 'pass'")
