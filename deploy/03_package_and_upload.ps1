param(
  [switch]$CreateRemoteBackup,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\deploy.config.ps1"

try {
Write-Host "==> Packaging project for upload" -ForegroundColor Cyan

$archivePath = Join-Path $env:TEMP $Script:TmpArchiveName
if (Test-Path $archivePath) {
  Remove-Item $archivePath -Force
}

$excludeArgs = @()
foreach ($item in $Script:ArchiveExcludes) {
  $excludeArgs += "--exclude=$item"
}

Push-Location $Script:ProjectRoot
try {
  & tar -czf "$archivePath" @excludeArgs .
  if ($LASTEXITCODE -ne 0) {
    throw "tar packaging failed."
  }
}
finally {
  Pop-Location
}

Write-Host "==> Uploading package to remote server" -ForegroundColor Cyan
& scp -i "$Script:SshKeyPath" "$archivePath" "$($Script:ServerUser)@$($Script:ServerHost):/tmp/$($Script:TmpArchiveName)"
if ($LASTEXITCODE -ne 0) {
  throw "Upload failed."
}

$backupCmd = ""
if ($CreateRemoteBackup) {
  $backupCmd = @'
if [ -d "__REMOTE_APP_DIR__" ]; then
  mv "__REMOTE_APP_DIR__" "__REMOTE_APP_DIR___backup_$(date +%Y%m%d_%H%M%S)"
fi
'@
  $backupCmd = $backupCmd.Replace("__REMOTE_APP_DIR__", $Script:RemoteAppDir)
}

$remoteCmd = @'
set -e
INCOMING_DIR="__REMOTE_APP_DIR__.__incoming"
if [ -z "__REMOTE_APP_DIR__" ] || [ "__REMOTE_APP_DIR__" = "/" ]; then
  echo "Unsafe remote app dir: __REMOTE_APP_DIR__"
  exit 1
fi
rm -rf "$INCOMING_DIR"
mkdir -p "$INCOMING_DIR"
if [ -f "__REMOTE_ENV_FILE_PATH__" ] && [ ! -f "$INCOMING_DIR/__REMOTE_ENV_FILE_NAME__" ]; then
  cp "__REMOTE_ENV_FILE_PATH__" "$INCOMING_DIR/__REMOTE_ENV_FILE_NAME__"
fi
__BACKUP_CMD__
tar -xzf "/tmp/__TMP_ARCHIVE_NAME__" -C "$INCOMING_DIR"
rm -f "/tmp/__TMP_ARCHIVE_NAME__"
if [ -d "__REMOTE_APP_DIR__" ]; then
  rm -rf "__REMOTE_APP_DIR__"
fi
mkdir -p "__REMOTE_APP_DIR__"
cp -a "$INCOMING_DIR"/. "__REMOTE_APP_DIR__"/
rm -rf "$INCOMING_DIR"
'@
$remoteCmd = $remoteCmd.
  Replace("__REMOTE_APP_DIR__", $Script:RemoteAppDir).
  Replace("__REMOTE_ENV_FILE_PATH__", $Script:RemoteEnvFilePath).
  Replace("__REMOTE_ENV_FILE_NAME__", $Script:RemoteEnvFileName).
  Replace("__TMP_ARCHIVE_NAME__", $Script:TmpArchiveName).
  Replace("__BACKUP_CMD__", $backupCmd)
$remoteCmd = $remoteCmd -replace "`r`n", "`n"

Write-Host "==> Extracting package on remote server" -ForegroundColor Cyan
$remoteCmd | & ssh -i "$Script:SshKeyPath" "$($Script:ServerUser)@$($Script:ServerHost)" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Remote extraction failed."
}

Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
Write-Host "Package uploaded successfully." -ForegroundColor Green
}
finally {
  Wait-IfRequested (-not $NoPause)
}
