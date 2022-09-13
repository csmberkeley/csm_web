from django.core.management import BaseCommand
from scheduler.models import User


class Command(BaseCommand):
    help = "Populates database with a single test user for testing."

    def handle(self, *args, **options):
        demo_user = User.objects.create(
            username="demo_user", email="demo_user@berkeley.edu"
        )
        demo_user.is_staff = True
        demo_user.is_superuser = True
        demo_user.set_password("pass")
        demo_user.save()
        print("Created demo user with username 'demo_user' and password 'pass'")
