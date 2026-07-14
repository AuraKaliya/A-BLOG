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

function Get-ProcessCommandLine {
    param([int]$ProcessId)
    return (Get-CimInstance Win32_Process -Filter "ProcessId=$ProcessId" -ErrorAction SilentlyContinue).CommandLine
}

function Stop-Pids {
    param([int[]]$Pids)
    foreach ($processId in $Pids | Sort-Object -Unique) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if (-not $process) {
            continue
        }
        Write-Step "Stopping existing process PID=$processId ($($process.ProcessName))"
        Stop-Process -Id $processId -Force
    }
}

function Stop-AblogServerByPort {
    param([int]$Port)
    $connections = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    if (-not $connections) {
        return
    }

    $targetPids = @()
    foreach ($conn in $connections) {
        $commandLine = Get-ProcessCommandLine -ProcessId $conn.OwningProcess
        if (-not $commandLine) {
            continue
        }

        $isProjectProcess = $commandLine -like "*$Root*"
        if (-not $isProjectProcess) {
            continue
        }

        $isDevProcess = ($commandLine -like "*manage.py*runserver*") -or
            ($commandLine -like "*astro.js*") -or
            ($commandLine -like "*npm run dev*")
        if ($isDevProcess) {
            $targetPids += $conn.OwningProcess
        }
    }

    Stop-Pids -Pids $targetPids
}

function Stop-OpenAblogWindows {
    $windows = Get-Process -Name powershell,pwsh -ErrorAction SilentlyContinue | Where-Object {
        $_.MainWindowTitle -like "*A-BLOG Backend*" -or $_.MainWindowTitle -like "*A-BLOG Frontend*"
    }

    if ($windows) {
        $pids = $windows | Select-Object -ExpandProperty Id
        Stop-Pids -Pids $pids
    }
}

Write-Step "Clean up stale local dev servers"
Stop-OpenAblogWindows
Stop-AblogServerByPort -Port 8000
Stop-AblogServerByPort -Port 4321

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
        & $PythonExe "backend\manage.py" sync_articles --prune
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
