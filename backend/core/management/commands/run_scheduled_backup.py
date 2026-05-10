from django.core.management.base import BaseCommand

from core.backup_scheduler import maybe_run_scheduled_backup


class Command(BaseCommand):
    help = 'Run automatic backups when enabled and the configured interval has passed.'

    def handle(self, *args, **options):
        maybe_run_scheduled_backup()
        self.stdout.write(self.style.SUCCESS('Scheduled backup check finished.'))
