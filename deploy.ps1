# =============================================================================
# Afghan Flag Management System - cPanel deploy (Windows PowerShell)
# Usage:
#   .\deploy.ps1                 # frontend only (default)
#   .\deploy.ps1 -Target all     # frontend + backend + migrate + restart
#   .\deploy.ps1 -Target backend # backend only
# =============================================================================

param(
    [ValidateSet('frontend', 'backend', 'all')]
    [string]$Target = 'frontend',

    [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'

$KEY = Join-Path $env:USERPROFILE '.ssh\afgha282_key'
$REMOTE = 'afgha282@server1.shahhost.net'
$ROOT = Split-Path -Parent $MyInvocation.MyCommand.Path
$FRONTEND = Join-Path $ROOT 'frontend'
$BACKEND = Join-Path $ROOT 'backend'
$SITE = 'https://afghanflags.com'

if (-not (Test-Path $KEY)) {
    Write-Error "SSH key not found: $KEY. See DEPLOY-CPANEL-SETUP.md"
}

function Invoke-Remote([string]$Command) {
    ssh -i $KEY -o IdentitiesOnly=yes -o BatchMode=yes $REMOTE $Command
}

function Deploy-Frontend {
    if (-not $SkipBuild) {
        Write-Host '>> Building frontend (CRA, REACT_APP_API_URL=https://afghanflags.com)...' -ForegroundColor Cyan
        Push-Location $FRONTEND
        $env:REACT_APP_API_URL = 'https://afghanflags.com'
        npm run build
        if ($LASTEXITCODE -ne 0) { Pop-Location; throw 'Frontend build failed' }
        Pop-Location
    } else {
        Write-Host '>> Skipping frontend build (-SkipBuild)' -ForegroundColor Yellow
    }

    $build = Join-Path $FRONTEND 'build'
    $index = Join-Path $build 'index.html'
    if (-not (Test-Path $index)) {
        throw "Missing $index - run npm run build first"
    }

    Write-Host '>> Uploading frontend/build -> ~/public_html/' -ForegroundColor Cyan
    Write-Host '   (does not overwrite public_html/.htaccess)' -ForegroundColor DarkGray
    scp -i $KEY -o IdentitiesOnly=yes -r (Join-Path $build '*') "${REMOTE}:~/public_html/"

    Write-Host '>> Frontend deployed.' -ForegroundColor Green
}

function Deploy-Backend {
    Write-Host '>> Uploading backend code (preserves db.sqlite3, media/, server .env)...' -ForegroundColor Cyan

    $files = @('manage.py', 'requirements.txt', 'requirements-cpanel.txt', 'passenger_wsgi.py')
    foreach ($f in $files) {
        $local = Join-Path $BACKEND $f
        if (Test-Path $local) {
            scp -i $KEY -o IdentitiesOnly=yes $local "${REMOTE}:~/backend/$f"
        }
    }

    $dirs = @(
        'backend', 'core', 'customers', 'expenses', 'purchases', 'employees',
        'inventory', 'orders', 'sales', 'dashboard', 'reports', 'roznamcha',
        'rent', 'printing', 'bank'
    )
    foreach ($d in $dirs) {
        $local = Join-Path $BACKEND $d
        if (Test-Path $local) {
            Write-Host "   uploading $d/"
            scp -i $KEY -o IdentitiesOnly=yes -r $local "${REMOTE}:~/backend/"
        }
    }

    Write-Host '>> Running migrate, collectstatic, restart...' -ForegroundColor Cyan
    $remoteCmd = 'cd ~/backend && source ~/virtualenv/backend/3.11/bin/activate && pip install -r requirements-cpanel.txt -q && python manage.py migrate --noinput && python manage.py collectstatic --noinput && mkdir -p ~/backend/tmp && touch ~/backend/tmp/restart.txt && echo BACKEND_OK'
    Invoke-Remote $remoteCmd

    Write-Host '>> Backend deployed.' -ForegroundColor Green
}

Write-Host ''
Write-Host "Afghan Flag MIS deploy -> $SITE" -ForegroundColor White
Write-Host "Target: $Target" -ForegroundColor White
Write-Host ''

switch ($Target) {
    'frontend' { Deploy-Frontend }
    'backend'  { Deploy-Backend }
    'all'      { Deploy-Frontend; Deploy-Backend }
}

Write-Host ''
Write-Host '>> Smoke test...' -ForegroundColor Cyan
$smoke = 'curl -s -o /dev/null -w site:%{http_code} api:%{http_code} https://afghanflags.com/ https://afghanflags.com/api/dashboard/'
Invoke-Remote $smoke
Write-Host '>> Done.' -ForegroundColor Green
