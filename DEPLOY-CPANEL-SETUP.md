# cPanel deploy — Afghan Flag Management System

**One-time:** convert the PuTTY key, then run the server discovery steps below.

| | |
|---|---|
| **Local folder** | `E:\Projects\Afghan-Flag\Afghan-Flag` |
| **Site** | https://afghanflags.com |
| **API** | https://afghanflags.com/api |
| **SSH user / home** | `afgha282` / `/home/afgha282` |
| **SSH host** | `server1.shahhost.net` |
| **PuTTY key (source)** | `C:\Users\DELL\Downloads\id_rsa (7).ppk` |
| **OpenSSH key (create)** | `C:\Users\DELL\.ssh\afgha282_key` |
| **One-command deploy** | `.\deploy.ps1` |

---

## Quick reference

| Field | Value |
|------|--------|
| Project | Afghan Flag printing MIS (inventory, orders, employees, reports) |
| Stack | React 18 (CRA + Tailwind) + Django 4.2 REST + JWT |
| GitHub | https://github.com/Mazalinternational/AfghanFlag |
| SSH user | `afgha282` |
| Home | `/home/afgha282` |
| SSH host | `server1.shahhost.net` |
| SSH key | `C:\Users\DELL\.ssh\afgha282_key` |
| Frontend build output | `frontend/build/` (Create React App — **not** Vite `dist/`) |
| Frontend live | `/home/afgha282/public_html` |
| Backend live | `/home/afgha282/backend` |
| Python (expected) | `/home/afgha282/virtualenv/backend/3.11/bin/python` |
| Passenger pattern | Site root (`PassengerBaseURI /`) — same as Dublin / Loqman ERP |
| Restart | `touch /home/afgha282/backend/tmp/restart.txt` |
| Database (live) | SQLite `~/backend/db.sqlite3` — **do not overwrite from PC** |
| Media | `~/backend/media/` |
| Production hosts | `afghanflags.com`, `www.afghanflags.com`, `api.afghanflags.com` |

---

## 1) Convert the private key (one time)

`id_rsa (7).ppk` is encrypted. Convert with **PuTTYgen**:

1. Open **PuTTYgen**
2. **Load** → `C:\Users\DELL\Downloads\id_rsa (7).ppk`
3. Enter the key passphrase when prompted
4. **Conversions → Export OpenSSH key (not PuTTY)**
5. Save as: `C:\Users\DELL\.ssh\afgha282_key`
6. Lock down permissions:

```powershell
icacls $env:USERPROFILE\.ssh\afgha282_key /inheritance:r
icacls $env:USERPROFILE\.ssh\afgha282_key /grant:r "$($env:USERNAME):(R)"
ssh-keygen -lf $env:USERPROFILE\.ssh\afgha282_key
```

Record the fingerprint here after conversion: `SHA256:…`

### Connect

```powershell
ssh -i $env:USERPROFILE\.ssh\afgha282_key afgha282@server1.shahhost.net
```

---

## 2) First-time server setup (run once on cPanel)

After SSH in, confirm layout:

```bash
pwd
ls -la
ls -la public_html
ls -la backend 2>/dev/null || echo "create backend"
ls ~/virtualenv/backend/3.11/bin/python 2>/dev/null || echo "create Python 3.11 venv in cPanel"
```

### Backend virtualenv + deps

```bash
cd ~/backend
source ~/virtualenv/backend/3.11/bin/activate
pip install -r requirements-cpanel.txt
python manage.py migrate --noinput
python manage.py collectstatic --noinput
mkdir -p ~/backend/tmp
touch ~/backend/tmp/restart.txt
```

### Production `.env` on server (`~/backend/.env`)

Copy from `backend/.env.example` — **never commit secrets**:

```env
DJANGO_DEBUG=False
DJANGO_SECRET_KEY=change-me-long-random-string
DJANGO_ALLOWED_HOSTS=afghanflags.com,www.afghanflags.com,api.afghanflags.com
DJANGO_CORS_ALLOWED_ORIGINS=
DJANGO_CSRF_TRUSTED_ORIGINS=
DJANGO_SECURE_SSL_REDIRECT=1
```

### Passenger + React SPA (`.htaccess`)

In cPanel → **Setup Python App** (or edit `~/public_html/.htaccess`):

- App root: `/home/afgha282/backend`
- Base URI: `/`
- Python: `3.11`

Use the template in `frontend/public/.htaccess` — it includes:

- Passenger block for Django (`/api`, `/admin`, `/media`)
- React Router fallback → `index.html`

**Important:** After cPanel writes the live Passenger block, copy those exact lines back into `frontend/public/.htaccess` in git so future deploys match production.

### Media symlink (if needed)

```bash
ln -sfn ~/backend/media ~/public_html/media
```

---

## 3) Deploy from this PC

```powershell
cd "E:\Projects\Afghan-Flag\Afghan-Flag"

# Frontend only (build + upload) — most common
.\deploy.ps1

# Frontend + backend + migrate + restart
.\deploy.ps1 -Target all

# Backend only
.\deploy.ps1 -Target backend

# Upload existing build/ without rebuilding
.\deploy.ps1 -SkipBuild
```

**Never delete** the Passenger lines in `public_html/.htaccess`. The deploy script uploads static files only and does **not** overwrite `.htaccess`.

---

## Architecture

Same pattern as **Loqman Khan ERP** / **Dublin Gleam**:

```
Browser → public_html/          (React CRA: index.html, static/, assets/)
       → Passenger → ~/backend (Django /api/*, /admin/, /media/)
```

| | Afghan Flag | Mazal International |
|---|---|---|
| Frontend build dir | `frontend/build/` | `frontend/dist/` |
| Build env var | `REACT_APP_API_URL` | `VITE_API_URL` |
| API mount | Site root Passenger | `public_html/api/` subfolder |

Frontend API config: `frontend/src/services/api.js` — production base URL is `https://afghanflags.com` (paths are `/api/...`).

---

## Project layout (local)

```
E:\Projects\Afghan-Flag\Afghan-Flag\
├── deploy.ps1
├── DEPLOY-CPANEL-SETUP.md
├── backend/
│   ├── manage.py
│   ├── passenger_wsgi.py
│   ├── requirements.txt
│   ├── requirements-cpanel.txt
│   ├── backend/          # Django settings, urls, wsgi
│   ├── core/             # Auth, users, backup
│   ├── inventory/, orders/, customers/, employees/
│   ├── expenses/, purchases/, sales/, reports/
│   ├── dashboard/, roznamcha/, rent/, printing/, bank/
│   ├── db.sqlite3        # LIVE DATA on server — do not replace
│   └── media/            # uploads — do not wipe
└── frontend/
    ├── public/.htaccess  # cPanel SPA + Passenger template
    ├── .env.production   # REACT_APP_API_URL=https://afghanflags.com
    └── build/            # CRA output → upload to ~/public_html/
```

### Main API routes (under `/api/`)

| Path | Purpose |
|------|---------|
| `/api/token/` | JWT login |
| `/api/auth/` | Users, backup |
| `/api/inventory/` | Stock (Press/Home) |
| `/api/orders/` | Orders |
| `/api/customers/` | Customers |
| `/api/employees/` | Employees & payroll |
| `/api/dashboard/` | Dashboard stats |
| `/api/reports/` | Reports |

---

## Manual deploy (step-by-step)

### Frontend

```powershell
cd "E:\Projects\Afghan-Flag\Afghan-Flag\frontend"
$env:REACT_APP_API_URL = "https://afghanflags.com"
npm run build

$KEY = "$env:USERPROFILE\.ssh\afgha282_key"
$HOST = "afgha282@server1.shahhost.net"
scp -i $KEY -o IdentitiesOnly=yes -r "build\*" "${HOST}:~/public_html/"
```

### Backend

```powershell
cd "E:\Projects\Afghan-Flag\Afghan-Flag"
.\deploy.ps1 -Target backend
```

### Restart Passenger

```bash
touch ~/backend/tmp/restart.txt
```

---

## Smoke tests

```bash
curl -I https://afghanflags.com/
curl -s -o /dev/null -w "%{http_code}\n" https://afghanflags.com/api/dashboard/
```

From PowerShell after deploy, `.\deploy.ps1` runs these automatically.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `403` / HTML on `/api/...` | Check `public_html/.htaccess` Passenger block and `PassengerAppRoot` |
| CORS errors | Set `DJANGO_CORS_ALLOWED_ORIGINS` / `DJANGO_CSRF_TRUSTED_ORIGINS` in server `.env` |
| React 404 on refresh | SPA rewrite rules missing in `.htaccess` |
| `ModuleNotFoundError` | `pip install -r requirements-cpanel.txt` in venv 3.11 |
| Wrong API URL in browser | Rebuild with `REACT_APP_API_URL=https://afghanflags.com` |
| White screen after deploy | Check browser console; verify `build/static/` uploaded |

---

## Security notes

- Do **not** commit `backend/.env`, `db.sqlite3`, or SSH keys
- Rotate the PuTTY key passphrase if it was shared in chat
- Keep `DEBUG=False` on production

---

## Related docs

- App README: `README.md`
- Frontend env: `frontend/ENV_CONFIG.md`
- Backend env template: `backend/.env.example`
- Public marketing site (separate repo): `E:\Projects\Afghan-Flag-website\VPS_DEPLOY.md`
