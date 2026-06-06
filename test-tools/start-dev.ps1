param(
    [switch]$SkipSetup
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$Root = (Resolve-Path (Join-Path $ScriptDir "..")).Path
$BackendDir = Join-Path $Root "backend"
$VenvDir = Join-Path $BackendDir ".venv"
$PythonExe = Join-Path $VenvDir "Scripts\python.exe"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command {
    param([string]$Name)
    $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

Write-Host "A-BLOG local dev launcher"
Write-Host "Project: $Root"

if (-not (Test-Command "python")) {
    throw "Python was not found in PATH."
}

if (-not (Test-Command "npm")) {
    throw "npm was not found in PATH."
}

if (-not $SkipSetup) {
    if (-not (Test-Path $PythonExe)) {
        Write-Step "Create backend virtual environment"
        python -m venv $VenvDir
    }

    Write-Step "Install backend dependencies"
    & $PythonExe -m pip install -r (Join-Path $BackendDir "requirements.txt")

    if (-not (Test-Path (Join-Path $Root "node_modules"))) {
        Write-Step "Install frontend dependencies"
        Push-Location $Root
        try {
            npm install
        } finally {
            Pop-Location
        }
    }

    Write-Step "Prepare Django database"
    Push-Location $Root
    try {
        $env:DJANGO_DEBUG = "1"
        $env:DJANGO_ALLOWED_HOSTS = "127.0.0.1,localhost,testserver"
        $env:A_BLOG_RESOURCE_ROOT = Join-Path $Root "resource"
        & $PythonExe "backend\manage.py" migrate
        & $PythonExe "backend\manage.py" seed_pages
        & $PythonExe "backend\manage.py" sync_articles
    } finally {
        Pop-Location
    }
}

$BackendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'A-BLOG Backend :8000'
Set-Location '$Root'
`$env:DJANGO_DEBUG = '1'
`$env:DJANGO_ALLOWED_HOSTS = '127.0.0.1,localhost,testserver'
`$env:A_BLOG_RESOURCE_ROOT = '$Root\resource'
& '$PythonExe' 'backend\manage.py' runserver 127.0.0.1:8000
"@

$FrontendCommand = @"
`$Host.UI.RawUI.WindowTitle = 'A-BLOG Frontend :4321'
Set-Location '$Root'
npm run dev -- --host 127.0.0.1
"@

Write-Step "Start backend and frontend"
Start-Process powershell.exe -ArgumentList "-NoExit", "-NoProfile", "-Command", $BackendCommand
Start-Process powershell.exe -ArgumentList "-NoExit", "-NoProfile", "-Command", $FrontendCommand

Write-Host ""
Write-Host "Started:"
Write-Host "  Frontend: http://127.0.0.1:4321/"
Write-Host "  Backend API: http://127.0.0.1:8000/api/"
Write-Host "  Console: http://127.0.0.1:8000/console/"
Write-Host ""
Write-Host "Close the two opened PowerShell windows to stop the servers."
