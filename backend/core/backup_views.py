import io
import zipfile

from django.http import FileResponse
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from core.backup_service import (
    add_uploaded_media_to_zip,
    build_excel_bytes,
    build_sql_bytes,
    filename_stamp,
)
from core.permissions import IsAdmin


class BackupDownloadView(APIView):
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        # Never use query param name `format` — DRF reserves it for content negotiation (json/api)
        # and returns 404 for unknown values like `excel`.
        fmt = (request.query_params.get('export') or 'both').lower()
        if fmt == 'xlsx':
            fmt = 'excel'

        stamp = filename_stamp()

        if fmt == 'excel':
            try:
                buf = build_excel_bytes()
            except Exception as exc:
                return Response({'detail': str(exc)}, status=500)
            resp = FileResponse(buf, as_attachment=True, filename=f'system_backup_{stamp}.xlsx')
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
            resp = FileResponse(buf, as_attachment=True, filename=f'system_backup_{stamp}.sql')
            resp['Content-Type'] = 'application/sql; charset=utf-8'
            return resp

        if fmt == 'both':
            mem = io.BytesIO()
            try:
                with zipfile.ZipFile(mem, 'w', zipfile.ZIP_DEFLATED) as zf:
                    try:
                        xlsx = build_excel_bytes()
                        zf.writestr(f'system_backup_{stamp}.xlsx', xlsx.getvalue())
                    except Exception as exc:
                        return Response({'detail': f'Excel export failed: {exc}'}, status=500)
                    try:
                        sql = build_sql_bytes()
                        zf.writestr(f'system_backup_{stamp}.sql', sql.getvalue())
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
            resp = FileResponse(mem, as_attachment=True, filename=f'system_backup_{stamp}.zip')
            resp['Content-Type'] = 'application/zip'
            return resp

        return Response({'detail': 'Invalid export. Use export=excel, sql, or both.'}, status=400)
