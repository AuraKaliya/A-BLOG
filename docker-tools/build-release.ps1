param(
  [string]$Version = "",
  [string]$ImageName = "aura-blog",
  [string]$BackendImageName = "aura-blog-backend",
  [string]$OutputDir = "",
  [string]$Remote = "",
  [string]$RemoteAppRoot = "/root/A-BLOG",
  [string]$RemoteDir = "/root/A-BLOG/releases",
  [switch]$NoBuild,
  [switch]$NoUpload
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$PackageJsonPath = Join-Path $RepoRoot "package.json"
$Package = Get-Content $PackageJsonPath -Raw | ConvertFrom-Json

if ([string]::IsNullOrWhiteSpace($Version)) {
  $Timestamp = Get-Date -Format "yyyyMMddHHmmss"
  $GitSha = ""
  try {
    $GitSha = (git -C $RepoRoot rev-parse --short HEAD 2>$null).Trim()
  } catch {
    $GitSha = ""
  }

  if ([string]::IsNullOrWhiteSpace($GitSha)) {
    $Version = "$($Package.version)-$Timestamp"
  } else {
    $Version = "$($Package.version)-$Timestamp-$GitSha"
  }
}

$Version = $Version -replace '[^A-Za-z0-9_.-]', '-'
$ImageTag = "${ImageName}:${Version}"
$LatestTag = "${ImageName}:latest"
$BackendImageTag = "${BackendImageName}:${Version}"
$BackendLatestTag = "${BackendImageName}:latest"

function New-ReleaseSecret {
  param([int]$Bytes = 32)

  $Buffer = New-Object byte[] $Bytes
  $Generator = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $Generator.GetBytes($Buffer)
  } finally {
    $Generator.Dispose()
  }
  return -join ($Buffer | ForEach-Object { $_.ToString("x2") })
}

function Get-ReleaseSecret {
  param(
    [string]$Name,
    [int]$Bytes = 32
  )

  $Value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($Value)) {
    return New-ReleaseSecret -Bytes $Bytes
  }
  return $Value
}

function Invoke-CheckedCommand {
  param(
    [string]$Description,
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Description failed with exit code $LASTEXITCODE."
  }
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker CLI was not found. Install Docker Desktop or Docker Engine, then run this script again."
}

if (-not (Get-Command tar -ErrorAction SilentlyContinue)) {
  throw "tar was not found. Install a tar-compatible archiver or run this script in an environment that provides tar."
}

if (-not [string]::IsNullOrWhiteSpace($Remote) -and -not $NoUpload) {
  if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw "ssh was not found. Install OpenSSH client or run without -Remote."
  }
  if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
    throw "scp was not found. Install OpenSSH client or run without -Remote."
  }
}

if ([string]::IsNullOrWhiteSpace($OutputDir)) {
  $OutputDir = Join-Path $RepoRoot "output/docker-release"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputDir)) {
  $OutputDir = Join-Path $RepoRoot $OutputDir
}

$ReleaseName = "$ImageName-$Version"
$StageParent = Join-Path $OutputDir "staging"
$StageDir = Join-Path $StageParent $ReleaseName

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
$ArchiveDir = (Resolve-Path $OutputDir).Path
$ArchivePath = Join-Path $ArchiveDir "$ReleaseName.tar.gz"
$ChecksumPath = "$ArchivePath.sha256"

if (Test-Path $StageDir) {
  Remove-Item -Recurse -Force $StageDir
}
New-Item -ItemType Directory -Force -Path $StageDir | Out-Null

Push-Location $RepoRoot
try {
  if (-not $NoBuild) {
    Write-Host "Building Docker image $ImageTag"
    Invoke-CheckedCommand "Building Docker image $ImageTag" { docker build --pull -t $ImageTag -t $LatestTag -f Dockerfile . }

    Write-Host "Building Docker image $BackendImageTag"
    Invoke-CheckedCommand "Building Docker image $BackendImageTag" { docker build --pull -t $BackendImageTag -t $BackendLatestTag -f backend/Dockerfile . }
  }

  Write-Host "Saving Docker images"
  Invoke-CheckedCommand "Saving Docker images" { docker save -o (Join-Path $StageDir "image.tar") $ImageTag $BackendImageTag }

  Copy-Item (Join-Path $RepoRoot "docker-tools/deploy/docker-compose.prod.yml") $StageDir
  Copy-Item (Join-Path $RepoRoot "docker-tools/deploy/update.sh") $StageDir
  Copy-Item (Join-Path $RepoRoot "docker-tools/deploy/update-latest.sh") $StageDir
  Copy-Item (Join-Path $RepoRoot "docker-tools/deploy/nginx-aurakaliye.com.conf") $StageDir

  $ReleaseEnvPath = Join-Path $StageDir "release.env"
  $DjangoSecretKey = Get-ReleaseSecret -Name "DJANGO_SECRET_KEY" -Bytes 48
  $PostgresPassword = Get-ReleaseSecret -Name "POSTGRES_PASSWORD" -Bytes 32
  $ViewSalt = Get-ReleaseSecret -Name "A_BLOG_VIEW_SALT" -Bytes 32
  $ReleaseEnvContent = @"
A_BLOG_IMAGE=$ImageTag
A_BLOG_BACKEND_IMAGE=$BackendImageTag
A_BLOG_VERSION=$Version
A_BLOG_CONTAINER=aura-blog
A_BLOG_BIND=127.0.0.1
A_BLOG_PORT=8080
DJANGO_SECRET_KEY=$DjangoSecretKey
POSTGRES_PASSWORD=$PostgresPassword
A_BLOG_VIEW_SALT=$ViewSalt
"@
  [System.IO.File]::WriteAllText($ReleaseEnvPath, $ReleaseEnvContent, [System.Text.UTF8Encoding]::new($false))

  @"
# $ReleaseName

Upload or copy this directory/archive to the server, then run:

  cd /root/A-BLOG/releases/$ReleaseName
  APP_ROOT=/root/A-BLOG sh ./update.sh

Server defaults:

  public reverse proxy target: http://127.0.0.1:8080
  resource directory: /root/A-BLOG/resource
  public resource URL prefix: https://aurakaliye.com/resource/

The included nginx-aurakaliye.com.conf is a first-time reverse proxy template.
"@ | Set-Content -Encoding UTF8 (Join-Path $StageDir "README.md")

  if (Test-Path $ArchivePath) {
    Remove-Item -Force $ArchivePath
  }
  if (Test-Path $ChecksumPath) {
    Remove-Item -Force $ChecksumPath
  }

  Push-Location $StageParent
  try {
    Write-Host "Creating archive $ArchivePath"
    Invoke-CheckedCommand "Creating archive $ArchivePath" { tar -czf $ArchivePath $ReleaseName }
  } finally {
    Pop-Location
  }

  $Hash = (Get-FileHash -Algorithm SHA256 $ArchivePath).Hash.ToLowerInvariant()
  "$Hash  $(Split-Path -Leaf $ArchivePath)" | Set-Content -Encoding ASCII $ChecksumPath

  if (-not [string]::IsNullOrWhiteSpace($Remote) -and -not $NoUpload) {
    Write-Host "Uploading archive to ${Remote}:${RemoteDir}"
    Invoke-CheckedCommand "Creating remote release directories" { ssh $Remote "mkdir -p '$RemoteDir' '$RemoteAppRoot/resource'" }
    Invoke-CheckedCommand "Uploading release archive" { scp $ArchivePath "${Remote}:$RemoteDir/" }
    Invoke-CheckedCommand "Uploading release checksum" { scp $ChecksumPath "${Remote}:$RemoteDir/" }
    Invoke-CheckedCommand "Uploading update-latest.sh" { scp (Join-Path $RepoRoot "docker-tools/deploy/update-latest.sh") "${Remote}:$RemoteAppRoot/update-latest.sh" }
  }

  Write-Host ""
  Write-Host "Release package ready:"
  Write-Host "  $ArchivePath"
  Write-Host "  $ChecksumPath"
  Write-Host ""
  Write-Host "Server update commands:"
  Write-Host "  cd $RemoteAppRoot"
  Write-Host "  sh ./update-latest.sh"
} finally {
  Pop-Location
}
