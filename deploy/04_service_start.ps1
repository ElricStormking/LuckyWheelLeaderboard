param(
  [switch]$Build,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\deploy.config.ps1"

try {
  Write-Host "==> Starting remote services" -ForegroundColor Cyan
  $upArgs = "up -d"
  if ($Build) {
    $upArgs = "up -d --build"
  }
  $remoteCmd = @"
set -e
if [ ! -f "$Script:RemoteEnvFilePath" ]; then
  echo "Missing $Script:RemoteEnvFileName in $Script:RemoteAppDir"
  exit 1
fi
cd "$Script:RemoteAppDir"
sudo docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" $upArgs --remove-orphans
sudo docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" ps
"@
  $remoteCmd = $remoteCmd -replace "`r`n", "`n"
  $remoteCmd | & ssh -i "$Script:SshKeyPath" "$($Script:ServerUser)@$($Script:ServerHost)" "bash -s"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to start remote services."
  }
  Write-Host "Remote services started." -ForegroundColor Green
}
finally {
  Wait-IfRequested (-not $NoPause)
}
