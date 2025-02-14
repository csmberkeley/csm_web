from django.core.management import BaseCommand, call_command


class Command(BaseCommand):
    help = "Initialize all repeated schedules."

    def handle(self, *args, **kwargs):
        # schedule attendance creation
        call_command("schedule_attendances")
