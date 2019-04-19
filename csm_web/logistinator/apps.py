from django.apps import AppConfig


class LogistinatorConfig(AppConfig):
    name = "logistinator"

    def ready(self):
        # registers signals
        import logistinator.signals
