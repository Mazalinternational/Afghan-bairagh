import os
import sys

# CloudLinux/cPanel: PassengerPython already points at the venv. Only re-exec when
# running outside the venv (e.g. manual CLI). Comparing paths literally fails because
# sys.executable is often python3.11_bin while INTERP is the python wrapper symlink.
_venv = os.path.expanduser('~/virtualenv/backend/3.11')
if _venv not in sys.executable:
    _interp = os.path.join(_venv, 'bin', 'python')
    os.execl(_interp, _interp, *sys.argv)

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

from backend.wsgi import application
