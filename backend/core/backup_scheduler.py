import logging
import os
import sys
import threading
import time

logger = logging.getLogger(__name__)

CHECK_INTERVAL_SEC = 900

FREQ_SECONDS = {
    'daily': 86400,
    'weekly': 86400 * 7,
    'monthly': 86400 * 30,
    'yearly': 86400 * 365,
}

_scheduler_started = False


def maybe_run_scheduled_backup():
    from django.db import close_old_connections
    from django.utils import timezone as dj_tz
    from core.models import SystemSettings
    from core.backup_service import write_automatic_backup_bundle

    close_old_connections()
    try:
        row = SystemSettings.get_settings()
    except Exception:
        logger.exception('Automatic backup: could not load system settings.')
        return

    if not row.backup_auto_enabled:
        return

    if not row.backup_include_excel and not row.backup_include_sql:
        return

    interval = FREQ_SECONDS.get(row.backup_frequency)
    if interval is None:
        return

    last = row.backup_last_auto_run_at
    if last is not None:
        elapsed = (dj_tz.now() - last).total_seconds()
        if elapsed < interval:
            return

    try:
        write_automatic_backup_bundle(row)
        row.backup_last_auto_run_at = dj_tz.now()
        row.save(update_fields=['backup_last_auto_run_at'])
    except Exception:
        logger.exception('Automatic backup failed.')


def _scheduler_loop():
    time.sleep(5)
    try:
        maybe_run_scheduled_backup()
    except Exception:
        logger.exception('Backup scheduler initial run failed.')
    while True:
        time.sleep(CHECK_INTERVAL_SEC)
        try:
            maybe_run_scheduled_backup()
        except Exception:
            logger.exception('Backup scheduler tick failed.')


def start_backup_scheduler_thread():
    global _scheduler_started
    if _scheduler_started:
        return
    t = threading.Thread(target=_scheduler_loop, name='backup-scheduler', daemon=True)
    t.start()
    _scheduler_started = True


def try_start_backup_scheduler():
    if os.environ.get('DISABLE_AUTO_BACKUP'):
        return
    argv_joined = ' '.join(sys.argv)
    skip_cmds = ('migrate', 'makemigrations', 'test', 'collectstatic', 'shell')
    if any(cmd in argv_joined for cmd in skip_cmds):
        return
    if 'runserver' in sys.argv and os.environ.get('RUN_MAIN') != 'true':
        return
    start_backup_scheduler_thread()
