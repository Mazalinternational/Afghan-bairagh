from django.apps import AppConfig


class RoznamchaConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "roznamcha"

    def ready(self):
        import roznamcha.signals
