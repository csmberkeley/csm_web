from django.core.management import BaseCommand
from scheduler.factories import generate_test_data


class Command(BaseCommand):
    help = "Populates database with randomly generated data for testing and creates demo accounts."

    def add_arguments(self, parser):
        parser.add_argument(
            "--complicated",
            action="store_true",
            dest="complicated",
            help="Complicate data by allowing users to have multiple profiles, potentially across different courses or roles.",
        )

    def handle(self, *args, **options):
        generate_test_data(options["complicated"])
