import io
import json
import os
import re
import sqlite3
import tempfile
import uuid
import zipfile
from decimal import Decimal
from datetime import date, datetime, timedelta
from pathlib import Path

from django.apps import apps
from django.conf import settings as django_settings
from django.db.models.fields.files import FieldFile
from django.utils import timezone

SKIP_MODEL_LABELS = {('sessions', 'session')}


def filename_stamp():
    return timezone.now().strftime('%Y%m%d_%H%M%S')


def sheet_title(model):
    raw = f'{model._meta.app_label}_{model.__name__}'
    raw = re.sub(r'[\[\]\*\/\\\?\:]', '_', raw)
    return (raw[:31] or 'data')


def cell_value(val):
    if val is None:
        return ''
    if isinstance(val, FieldFile):
        try:
            return val.name or ''
        except Exception:
            return str(val) if val else ''
    if isinstance(val, uuid.UUID):
        return str(val)
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val
    if isinstance(val, Decimal):
        return float(val)
    if isinstance(val, datetime):
        return val.isoformat()
    if isinstance(val, date):
        return val.isoformat()
    if isinstance(val, timedelta):
        return str(val)
    if isinstance(val, (dict, list)):
        return json.dumps(val, ensure_ascii=False)
    if isinstance(val, bytes):
        return val.hex()
    return str(val)


def build_excel_bytes():
    """
    Export every non-proxy model: concrete columns plus comma-separated related PKs for each
    local many-to-many. Uses a standard (non-write_only) workbook so Excel reliably contains data.
    """
    from openpyxl import Workbook

    wb = Workbook()
    used_titles = {}
    first_sheet = True

    for model in apps.get_models():
        if model._meta.proxy:
            continue
        label = (model._meta.app_label, model._meta.model_name)
        if label in SKIP_MODEL_LABELS:
            continue

        title = sheet_title(model)
        base_title = title
        n = 2
        while title in used_titles:
            suffix = f'_{n}'
            title = (base_title[: max(1, 31 - len(suffix))] + suffix)
            n += 1
        used_titles[title] = True

        if first_sheet:
            ws = wb.active
            ws.title = title
            first_sheet = False
        else:
            ws = wb.create_sheet(title=title)

        concrete = list(model._meta.concrete_fields)
        m2m_local = list(model._meta.local_many_to_many)

        headers = [f.name for f in concrete]
        for m in m2m_local:
            headers.append(f'm2m_{m.name}')

        ws.append(headers)

        qs = model.objects.all()
        prefetch = [m.name for m in m2m_local]
        if prefetch:
            qs = qs.prefetch_related(*prefetch)

        try:
            rows = qs.iterator(chunk_size=500)
        except Exception:
            rows = qs

        for obj in rows:
            row = []
            for field in concrete:
                try:
                    v = field.value_from_object(obj)
                except Exception:
                    v = getattr(obj, field.name, None)
                row.append(cell_value(v))
            for m in m2m_local:
                try:
                    pks = list(getattr(obj, m.name).values_list('pk', flat=True))
                    row.append(','.join(str(x) for x in pks))
                except Exception:
                    row.append('')
            ws.append(row)

    if not used_titles:
        ws = wb.create_sheet(title='info')
        ws.append(['message'])
        ws.append(['No models exported.'])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


def build_sql_bytes():
    engine = django_settings.DATABASES['default']['ENGINE']
    if 'sqlite' not in engine:
        raise RuntimeError('SQL text backup is only supported for SQLite databases.')
    db_path = Path(django_settings.DATABASES['default']['NAME'])
    if not db_path.is_file():
        raise RuntimeError('Database file not found.')

    fd, tmp_path = tempfile.mkstemp(suffix='.sqlite3')
    os.close(fd)
    try:
        # Hot-copy live DB with SQLite backup API (works with WAL; plain copy can miss pages)
        src = sqlite3.connect(str(db_path))
        dst_live = sqlite3.connect(tmp_path)
        try:
            src.backup(dst_live)
        finally:
            dst_live.close()
            src.close()

        conn = sqlite3.connect(tmp_path)
        try:
            out = io.BytesIO()
            for line in conn.iterdump():
                out.write(line.encode('utf-8'))
                out.write(b'\n')
        finally:
            conn.close()
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
    out.seek(0)
    return out


def _should_skip_media_path(full_path: Path, media_root: Path) -> bool:
    """Avoid nesting backup zips and huge auto-backup folders."""
    try:
        rel = full_path.relative_to(media_root)
    except ValueError:
        return True
    parts = rel.parts
    if len(parts) >= 1 and parts[0] == 'backups':
        return True
    return False


def add_uploaded_media_to_zip(zf: zipfile.ZipFile):
    """
    Append files under MEDIA_ROOT as media/... so logos and uploads are restorable beside DB/SQL.
    Skips media/backups/** to avoid recursive zip bloat.
    """
    root = Path(django_settings.MEDIA_ROOT)
    if not root.is_dir():
        return

    for path in root.rglob('*'):
        if not path.is_file():
            continue
        if _should_skip_media_path(path, root):
            continue
        try:
            arcname = Path('media') / path.relative_to(root)
            zf.write(path, arcname.as_posix())
        except OSError:
            continue


def prune_old_backups(directory: Path, keep=40):
    files = sorted(directory.glob('backup_auto_*'), key=lambda p: p.stat().st_mtime, reverse=True)
    for p in files[keep:]:
        try:
            p.unlink()
        except OSError:
            pass


def write_automatic_backup_bundle(settings_row):
    if not settings_row.backup_include_excel and not settings_row.backup_include_sql:
        return
    dest = Path(django_settings.MEDIA_ROOT) / 'backups' / 'auto'
    dest.mkdir(parents=True, exist_ok=True)
    stamp = filename_stamp()
    excel_buf = None
    sql_buf = None
    if settings_row.backup_include_excel:
        excel_buf = build_excel_bytes()
    if settings_row.backup_include_sql:
        sql_buf = build_sql_bytes()

    if excel_buf and sql_buf:
        zip_path = dest / f'backup_auto_{stamp}.zip'
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zf:
            zf.writestr(f'system_backup_{stamp}.xlsx', excel_buf.getvalue())
            zf.writestr(f'system_backup_{stamp}.sql', sql_buf.getvalue())
            add_uploaded_media_to_zip(zf)
    elif excel_buf:
        (dest / f'backup_auto_{stamp}.xlsx').write_bytes(excel_buf.getvalue())
    elif sql_buf:
        (dest / f'backup_auto_{stamp}.sql').write_bytes(sql_buf.getvalue())

    prune_old_backups(dest, keep=40)
