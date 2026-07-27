import io
import tempfile
import zipfile
from pathlib import Path

from django.http import FileResponse
from django.utils.dateparse import parse_date
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.backup_service import (
    add_uploaded_media_to_zip,
    build_excel_bytes,
    build_sql_bytes,
    filename_stamp,
    restore_media_tree,
    restore_sql_bytes,
)
from core.permissions import IsAdmin


def _resolve_backup_label(request):
    """
    Period presets label the backup file only.
    Downloads always include the full system data (all tables / SQL / media).
    """
    preset = (request.query_params.get('preset') or 'all').lower()
    date_from = request.query_params.get('date_from')
    date_to = request.query_params.get('date_to')

    if preset not in ('all', 'daily', 'weekly', 'monthly', 'yearly', 'custom', ''):
        raise ValueError('Invalid preset. Use all, daily, weekly, monthly, yearly, or custom.')

    if preset == 'custom':
        start_date = parse_date(date_from or '')
        end_date = parse_date(date_to or '') if date_to else None
        if not start_date or not end_date:
            raise ValueError('Custom range requires valid date_from and date_to values.')
        if end_date < start_date:
            raise ValueError('date_to cannot be earlier than date_from.')
        return 'custom', f'{start_date.isoformat()}_to_{end_date.isoformat()}'

    if preset in ('', 'all'):
        return 'all', 'all'

    return preset, preset


class BackupDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Never use query param name `format` — DRF reserves it for content negotiation (json/api)
        # and returns 404 for unknown values like `excel`.
        fmt = (request.query_params.get('export') or 'both').lower()
        if fmt == 'xlsx':
            fmt = 'excel'

        stamp = filename_stamp()
        try:
            _preset, label = _resolve_backup_label(request)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=400)

        # Always export full system data; period is only used in the filename.
        file_prefix = f'system_backup_{label}_{stamp}'

        if fmt == 'excel':
            try:
                buf = build_excel_bytes()
            except Exception as exc:
                return Response({'detail': str(exc)}, status=500)
            resp = FileResponse(buf, as_attachment=True, filename=f'{file_prefix}.xlsx')
            resp['Content-Type'] = (
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            )
            return resp

        if fmt == 'sql':
            try:
                buf = build_sql_bytes()
            except RuntimeError as exc:
                return Response({'detail': str(exc)}, status=400)
            except Exception as exc:
                return Response({'detail': str(exc)}, status=500)
            resp = FileResponse(buf, as_attachment=True, filename=f'{file_prefix}.sql')
            resp['Content-Type'] = 'application/sql; charset=utf-8'
            return resp

        if fmt == 'both':
            mem = io.BytesIO()
            try:
                with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as zf:
                    try:
                        xlsx = build_excel_bytes()
                        zf.writestr(f'{file_prefix}.xlsx', xlsx.getvalue())
                    except Exception as exc:
                        return Response({'detail': f'Excel export failed: {exc}'}, status=500)
                    try:
                        sql = build_sql_bytes()
                        zf.writestr(f'{file_prefix}.sql', sql.getvalue())
                    except RuntimeError as exc:
                        return Response({'detail': str(exc)}, status=400)
                    except Exception as exc:
                        return Response({'detail': f'SQL export failed: {exc}'}, status=500)
                    try:
                        add_uploaded_media_to_zip(zf)
                    except Exception as exc:
                        return Response({'detail': f'Media bundle failed: {exc}'}, status=500)
            except Exception as exc:
                return Response({'detail': str(exc)}, status=500)
            mem.seek(0)
            resp = FileResponse(mem, as_attachment=True, filename=f'{file_prefix}.zip')
            resp['Content-Type'] = 'application/zip'
            return resp

        return Response({'detail': 'Invalid export. Use export=excel, sql, or both.'}, status=400)


class BackupRestoreView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get('file')
        if not upload:
            return Response({'detail': 'Backup file is required.'}, status=400)

        filename = (upload.name or '').lower()
        sql_bytes = None
        temp_dir = tempfile.TemporaryDirectory()
        media_dir = None

        try:
            if filename.endswith('.sql'):
                sql_bytes = upload.read()
            elif filename.endswith('.zip'):
                with zipfile.ZipFile(upload) as zf:
                    sql_names = [name for name in zf.namelist() if name.lower().endswith('.sql')]
                    if not sql_names:
                        return Response(
                            {'detail': 'ZIP backup does not contain a SQL file. Only full backup ZIP files can be restored.'},
                            status=400,
                        )
                    sql_bytes = zf.read(sql_names[0])
                    media_members = [name for name in zf.namelist() if name.startswith('media/') and not name.endswith('/')]
                    if media_members:
                        media_dir = Path(temp_dir.name) / 'media'
                        for member in media_members:
                            target = Path(temp_dir.name) / member
                            target.parent.mkdir(parents=True, exist_ok=True)
                            target.write_bytes(zf.read(member))
            else:
                return Response({'detail': 'Unsupported backup file. Upload a .sql or full .zip backup.'}, status=400)

            restore_sql_bytes(sql_bytes or b'')
            if media_dir is not None:
                restore_media_tree(media_dir)
            return Response({'detail': 'Backup restored successfully.'})
        except RuntimeError as exc:
            return Response({'detail': str(exc)}, status=400)
        except zipfile.BadZipFile:
            return Response({'detail': 'Invalid ZIP backup file.'}, status=400)
        except Exception as exc:
            return Response({'detail': f'Restore failed: {exc}'}, status=500)
        finally:
            temp_dir.cleanup()
