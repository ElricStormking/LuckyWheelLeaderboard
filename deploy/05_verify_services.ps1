param(
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\deploy.config.ps1"

try {
Write-Host "==> Verifying remote services and endpoints" -ForegroundColor Cyan
$remoteCmd = @'
set -e
cd "__REMOTE_APP_DIR__"
if [ ! -f "__REMOTE_ENV_FILE_PATH__" ]; then
  echo "Missing __REMOTE_ENV_FILE_NAME__ in __REMOTE_APP_DIR__"
  exit 1
fi
MERCHANT_TOKEN=$(grep '^MERCHANT_API_SERVICE_TOKEN=' "__REMOTE_ENV_FILE_NAME__" | tail -n 1 | cut -d= -f2- | tr -d '\r')
if [ -z "$MERCHANT_TOKEN" ]; then
  MERCHANT_TOKEN="lw-local-dev-merchant-api-service-token"
fi
sudo docker compose --env-file "__REMOTE_ENV_FILE_NAME__" -f "__COMPOSE_FILE_NAME__" ps
echo '---'
printf 'Game HTTP      : '
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
printf 'Admin HTTP     : '
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4002/
printf 'API HTTP       : '
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:4000/api/v2/config/localization
printf 'Merchant HTTP  : '
MERCHANT_HTTP=$(MERCHANT_TOKEN="$MERCHANT_TOKEN" python3 -c "import os, urllib.request; request = urllib.request.Request('http://127.0.0.1:4003/merchant-api/v1/health', headers={'Authorization': 'Bearer ' + os.environ.get('MERCHANT_TOKEN', '')}); response = urllib.request.urlopen(request, timeout=20); print(response.status); response.close()" 2>/dev/null)
MERCHANT_STATUS=$?
if [ -z "$MERCHANT_HTTP" ]; then
  MERCHANT_HTTP="000"
fi
if [ "$MERCHANT_STATUS" -ne 0 ]; then
  echo "$MERCHANT_HTTP"
  exit "$MERCHANT_STATUS"
fi
echo "$MERCHANT_HTTP"
'@
$remoteCmd = $remoteCmd.
  Replace("__REMOTE_APP_DIR__", $Script:RemoteAppDir).
  Replace("__REMOTE_ENV_FILE_PATH__", $Script:RemoteEnvFilePath).
  Replace("__REMOTE_ENV_FILE_NAME__", $Script:RemoteEnvFileName).
  Replace("__COMPOSE_FILE_NAME__", $Script:ComposeFileName)
$remoteCmd = $remoteCmd -replace "`r`n", "`n"

$remoteCmd | & ssh -i "$Script:SshKeyPath" "$($Script:ServerUser)@$($Script:ServerHost)" "bash -s"
if ($LASTEXITCODE -ne 0) {
  throw "Verification failed."
}

Write-Host "Public URLs (requires GCP firewall allow):" -ForegroundColor Yellow
Write-Host "  Game : http://$($Script:ServerHost):3000"
Write-Host "  Admin: http://$($Script:ServerHost):4002"
Write-Host "  API  : http://$($Script:ServerHost):4000/api/v2/config/localization"
Write-Host "  Merchant API: http://$($Script:ServerHost):4003/merchant-api/integration/launch"
Write-Host "Verification completed." -ForegroundColor Green
}
finally {
  Wait-IfRequested (-not $NoPause)
}
