from django.core.management import BaseCommand
from scheduler.factories import generate_test_data


class Command(BaseCommand):
    help = "Populates database with randomly generated data for testing and creates demo accounts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--yes",
            action="store_true",
            dest="preconfirm",
            help="Run without asking for confirmation",
        )

    def handle(self, *args, **options):
        generate_test_data(options["preconfirm"])
