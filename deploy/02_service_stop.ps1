param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\deploy.config.ps1"

try {
  Write-Host "==> Stopping remote services (maintenance mode)" -ForegroundColor Cyan
  $remoteCmd = @"
set -e
if [ ! -d "$Script:RemoteAppDir" ] || [ ! -f "$Script:RemoteAppDir/$($Script:ComposeFileName)" ]; then
  echo "Remote app directory or compose file not found. Nothing to stop."
  exit 0
fi
if [ ! -f "$Script:RemoteEnvFilePath" ]; then
  echo "Missing $Script:RemoteEnvFileName in $Script:RemoteAppDir"
  exit 1
fi
cd "$Script:RemoteAppDir"
sudo docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" down
"@
  $remoteCmd = $remoteCmd -replace "`r`n", "`n"
  $remoteCmd | & ssh -i "$Script:SshKeyPath" "$($Script:ServerUser)@$($Script:ServerHost)" "bash -s"
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to stop remote services."
  }
  Write-Host "Remote services stopped." -ForegroundColor Green
}
finally {
  Wait-IfRequested (-not $NoPause)
}
