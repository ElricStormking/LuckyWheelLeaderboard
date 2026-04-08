param(
  [int]$LocalPort = 5555,
  [switch]$NoBrowser,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\deploy.config.ps1"

function Test-LocalPortAvailable([int]$Port) {
  $listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
  try {
    $listener.Start()
    return $true
  }
  catch {
    return $false
  }
  finally {
    try {
      $listener.Stop()
    }
    catch {
    }
  }
}

try {
  Write-Host "==> Opening Prisma Studio tunnel" -ForegroundColor Cyan

  if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    throw "ssh is not available on this machine."
  }

  if (-not (Test-LocalPortAvailable $LocalPort)) {
    throw "Local port $LocalPort is already in use. Choose another with -LocalPort."
  }

  $studioUrl = "http://127.0.0.1:$LocalPort"
  Write-Host "Prisma Studio URL: $studioUrl" -ForegroundColor Green
  Write-Host "Press Ctrl+C to close the tunnel and stop Prisma Studio." -ForegroundColor Yellow

  if (-not $NoBrowser) {
    Start-Job -ScriptBlock {
      param($Url)
      Start-Sleep -Seconds 3
      Start-Process $Url
    } -ArgumentList $studioUrl | Out-Null
  }

  $remoteCommand =
    "sudo docker run --rm --network host " +
    "-e DATABASE_URL=file:/data/dev.db " +
    "-v luckywheelleaderboard_api-db:/data " +
    "-w /app/apps/api " +
    "luckywheelleaderboard-api " +
    "sh -lc 'npx prisma studio --schema prisma/schema.prisma --browser none --hostname 127.0.0.1 --port $LocalPort'"

  & ssh `
    -L "${LocalPort}:127.0.0.1:${LocalPort}" `
    -i "$Script:SshKeyPath" `
    "$($Script:ServerUser)@$($Script:ServerHost)" `
    $remoteCommand

  if ($LASTEXITCODE -ne 0) {
    throw "Prisma Studio tunnel exited with code $LASTEXITCODE."
  }
}
finally {
  Wait-IfRequested (-not $NoPause)
}
