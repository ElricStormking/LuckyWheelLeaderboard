$ErrorActionPreference = "Stop"

# Shared deployment configuration (all scripts dot-source this file)
$candidateRoots = @(
  (Resolve-Path (Join-Path $PSScriptRoot "..")).Path,
  (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
)
$Script:ProjectRoot = $null
foreach ($root in $candidateRoots) {
  if ((Test-Path (Join-Path $root "package.json")) -and (Test-Path (Join-Path $root "apps"))) {
    $Script:ProjectRoot = $root
    break
  }
}
if (-not $Script:ProjectRoot) {
  throw "Unable to locate project root from $PSScriptRoot"
}

$composeCandidates = @("docker-compose.yml", "docker-compose.yaml", "compose.yml", "compose.yaml")
$Script:ComposeFileName = $null
foreach ($composeFile in $composeCandidates) {
  if (Test-Path (Join-Path $Script:ProjectRoot $composeFile)) {
    $Script:ComposeFileName = $composeFile
    break
  }
}
if (-not $Script:ComposeFileName) {
  throw "Unable to locate a Docker Compose file in $Script:ProjectRoot"
}

$Script:ComposeFilePath = Join-Path $Script:ProjectRoot $Script:ComposeFileName
$Script:SshKeyPath = Join-Path $Script:ProjectRoot "GCP_Server_SSHKey\gcp_ubuntu_rsa"
$Script:ServerUser = "ehooraygm"
$Script:ServerHost = "34.81.237.79"
$Script:RemoteAppDir = "/home/ehooraygm/LuckyWheelLeaderboard"
$Script:RemoteEnvFileName = ".env.production"
$Script:RemoteEnvFilePath = "$Script:RemoteAppDir/$($Script:RemoteEnvFileName)"

# Upload package settings
$Script:TmpArchiveName = "luckywheel_deploy.tgz"
$Script:ArchiveExcludes = @(
  ".git",
  "node_modules",
  ".npm-cache",
  ".tmp",
  ".env.production",
  "GCP_Server_SSHKey",
  "SampleUI",
  "Merchant_API_example",
  "Customer_Platform_API_TW.docx",
  "*.log",
  "**/dist",
  "**/node_modules"
)

function Wait-IfRequested([bool]$KeepOpen) {
  if ($KeepOpen) {
    try {
      Read-Host "Done. Press Enter to close" | Out-Null
      return
    }
    catch {
      try {
        cmd /c pause | Out-Null
        return
      }
      catch {
        Start-Sleep -Seconds 20
      }
    }
  }
}
