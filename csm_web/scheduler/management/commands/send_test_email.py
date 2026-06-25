from django.core.management.base import BaseCommand

from scheduler.notifications.ops_notifications import GoogleGmailSender


class Command(BaseCommand):
    help = "Send a real test email through the Gmail API."

    def add_arguments(self, parser):
        parser.add_argument("email")

    def handle(self, *args, **options):
        email = options["email"]

        result = GoogleGmailSender(
            credentials_file="csm_web/scheduler/notifications/credentials.json",
            token_file="csm_web/scheduler/notifications/token.json",
        ).send_message(
            to_email=email,
            subject="CSM web Gmail API test",
            body=(
                "Hi,\n\n"
                "This is a real test email from the CSM web backend.\n\n"
                "Best,\n"
                "CSM web"
            ),
        )

        self.stdout.write(self.style.SUCCESS(f"Sent email: {result}"))