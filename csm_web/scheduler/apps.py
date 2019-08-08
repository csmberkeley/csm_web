from django.apps import AppConfig


class SchedulerConfig(AppConfig):
    name = "scheduler"

    def ready(self):
        # registers signals
        # pylint:disable=unused-variable
        import scheduler.signals
