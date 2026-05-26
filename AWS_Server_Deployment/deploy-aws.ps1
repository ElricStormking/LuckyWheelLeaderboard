param(
  [switch]$Check,
  [switch]$PrepareServer,
  [switch]$Upload,
  [switch]$UploadEnv,
  [switch]$Start,
  [switch]$Build,
  [switch]$Verify,
  [switch]$All,
  [switch]$UseGcpJump,
  [switch]$CreateRemoteBackup,
  [switch]$SkipSshCheck,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"

$Script:ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Script:ComposeFileName = "docker-compose.yml"
$Script:ComposeFilePath = Join-Path $Script:ProjectRoot $Script:ComposeFileName
$Script:SshKeyPath = Join-Path $PSScriptRoot "ALYSG-Unix-TW20060318.pem"
$Script:ServerUser = "root"
$Script:ServerHost = "47.236.166.230"
$Script:PublicBaseUrl = "https://ibetlucky.org"
$Script:JumpSshKeyPath = Join-Path $Script:ProjectRoot "GCP_Server_SSHKey\gcp_ubuntu_rsa"
$Script:JumpServerUser = "ehooraygm"
$Script:JumpServerHost = "34.81.237.79"
$Script:RemoteAppDir = "/opt/LuckyWheelLeaderboard"
$Script:RemoteEnvFileName = ".env.production"
$Script:RemoteEnvFilePath = "$Script:RemoteAppDir/$($Script:RemoteEnvFileName)"
$Script:AwsComposeOverrideFileName = "docker-compose.aws.yml"
$Script:TmpArchiveName = "luckywheel_aws_deploy.tgz"
$Script:TmpEnvName = "luckywheel_aws_env.production"

function Write-Step($Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Wait-IfRequested([bool]$KeepOpen) {
  if ($KeepOpen) {
    try {
      Read-Host "Done. Press Enter to close" | Out-Null
    }
    catch {
      Start-Sleep -Seconds 20
    }
  }
}

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Fix-SshKeyPermissions($KeyPath) {
  Write-Step "Fixing SSH key ACL for current Windows user"
  $resolvedPath = (Resolve-Path $KeyPath).Path
  $currentUser = New-Object System.Security.Principal.NTAccount($env:USERDOMAIN, $env:USERNAME)
  $administrators = New-Object System.Security.Principal.NTAccount("BUILTIN", "Administrators")
  $systemAccount = New-Object System.Security.Principal.NTAccount("NT AUTHORITY", "SYSTEM")
  $acl = New-Object System.Security.AccessControl.FileSecurity
  $acl.SetAccessRuleProtection($true, $false)
  $acl.SetOwner($currentUser)

  $rules = @(
    (New-Object System.Security.AccessControl.FileSystemAccessRule(
      $currentUser,
      [System.Security.AccessControl.FileSystemRights]::Read,
      [System.Security.AccessControl.AccessControlType]::Allow
    )),
    (New-Object System.Security.AccessControl.FileSystemAccessRule(
      $administrators,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      [System.Security.AccessControl.AccessControlType]::Allow
    )),
    (New-Object System.Security.AccessControl.FileSystemAccessRule(
      $systemAccount,
      [System.Security.AccessControl.FileSystemRights]::FullControl,
      [System.Security.AccessControl.AccessControlType]::Allow
    ))
  )

  foreach ($rule in $rules) {
    [void]$acl.AddAccessRule($rule)
  }

  Set-Acl -LiteralPath $resolvedPath -AclObject $acl
}

function Get-SshArgs {
  $args = @(
    "-i", $Script:SshKeyPath,
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=20",
    "-o", "StrictHostKeyChecking=accept-new"
  )
  if ($UseGcpJump) {
    $proxyCommand = "ssh -i `"$Script:JumpSshKeyPath`" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -W %h:%p $($Script:JumpServerUser)@$($Script:JumpServerHost)"
    $args += @("-o", "ProxyCommand=$proxyCommand")
  }
  return $args
}

function Invoke-SshText($RemoteCommand) {
  $sshArgs = Get-SshArgs
  $target = "$($Script:ServerUser)@$($Script:ServerHost)"
  $oldErrorActionPreference = $ErrorActionPreference
  $ErrorActionPreference = "Continue"
  try {
    $output = & ssh @sshArgs $target $RemoteCommand 2>&1
    $exitCode = $LASTEXITCODE
  }
  catch {
    $output = $_.Exception.Message
    $exitCode = if ($LASTEXITCODE) { $LASTEXITCODE } else { 255 }
  }
  finally {
    $ErrorActionPreference = $oldErrorActionPreference
  }
  return @{
    ExitCode = $exitCode
    Text = ($output | Out-String)
  }
}

function Invoke-RemoteScript($ScriptText) {
  $sshArgs = Get-SshArgs
  $target = "$($Script:ServerUser)@$($Script:ServerHost)"
  $normalizedScript = $ScriptText -replace "`r`n", "`n" -replace "`r", ""
  $normalizedScript | & ssh @sshArgs $target "tr -d '\r' | bash -s"
  if ($LASTEXITCODE -ne 0) {
    throw "Remote command failed."
  }
}

function Invoke-Scp($Source, $Destination) {
  $scpArgs = @(
    "-i", $Script:SshKeyPath,
    "-o", "BatchMode=yes",
    "-o", "ConnectTimeout=20",
    "-o", "StrictHostKeyChecking=accept-new"
  )
  if ($UseGcpJump) {
    $proxyCommand = "ssh -i `"$Script:JumpSshKeyPath`" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -W %h:%p $($Script:JumpServerUser)@$($Script:JumpServerHost)"
    $scpArgs += @("-o", "ProxyCommand=$proxyCommand")
  }
  $scpArgs += @($Source, $Destination)
  & scp @scpArgs
  if ($LASTEXITCODE -ne 0) {
    throw "SCP failed: $Source -> $Destination"
  }
}

function Set-DotenvValue($Content, $Name, $Value) {
  $escapedName = [regex]::Escape($Name)
  $escapedValue = $Value.Replace("`r", "").Replace("`n", "")
  if ($Content -match "(?m)^$escapedName=") {
    return [regex]::Replace($Content, "(?m)^$escapedName=.*$", "$Name=$escapedValue")
  }
  return ($Content.TrimEnd() + "`n$Name=$escapedValue`n")
}

function New-AwsEnvFile {
  $sourceEnv = Join-Path $Script:ProjectRoot ".env.production"
  if (-not (Test-Path $sourceEnv)) {
    throw "Missing local .env.production. Create it before using -UploadEnv."
  }

  $content = Get-Content -Raw $sourceEnv
  $content = Set-DotenvValue $content "LUCKY_WHEEL_CLIENT_BASE_URL" $Script:PublicBaseUrl
  $content = Set-DotenvValue $content "UPLOAD_PUBLIC_BASE_URL" "$($Script:PublicBaseUrl)/api/uploads"
  $content = Set-DotenvValue $content "CUSTOMER_PLATFORM_DEPOSIT_URL" "$($Script:PublicBaseUrl)/?deposit=1"

  $tempEnvPath = Join-Path $env:TEMP $Script:TmpEnvName
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($tempEnvPath, $content, $utf8NoBom)
  return $tempEnvPath
}

function Invoke-Check {
  Write-Step "Checking local prerequisites"
  Assert-Command "ssh"
  Assert-Command "scp"
  Assert-Command "tar"

  if (-not (Test-Path $Script:ComposeFilePath)) {
    throw "Docker Compose file not found: $Script:ComposeFilePath"
  }
  if (-not (Test-Path $Script:SshKeyPath)) {
    throw "SSH key not found: $Script:SshKeyPath"
  }

  if (-not $SkipSshCheck) {
    Write-Step "Testing SSH access to AWS host"
    $probe = Invoke-SshText "echo SSH_OK"

    if ($probe.ExitCode -ne 0 -and $probe.Text -match "UNPROTECTED PRIVATE KEY FILE|bad permissions") {
      Fix-SshKeyPermissions -KeyPath $Script:SshKeyPath
      Write-Step "Retrying SSH test after key permission fix"
      $probe = Invoke-SshText "echo SSH_OK"
    }

    if ($probe.ExitCode -ne 0 -or $probe.Text -notmatch "SSH_OK") {
      throw "SSH test failed for $($Script:ServerUser)@$($Script:ServerHost):`n$($probe.Text)"
    }
  }

  Write-Host "Prerequisite check passed." -ForegroundColor Green
}

function Invoke-PrepareServer {
  Write-Step "Preparing AlmaLinux server"
  $remoteCmd = @'
set -euo pipefail
if [ "$(id -u)" -ne 0 ]; then
  echo "This AWS deployment expects SSH as root."
  exit 1
fi

echo "OS: $(. /etc/os-release && echo "$PRETTY_NAME")"
dnf -y install dnf-plugins-core ca-certificates curl tar gzip

if ! command -v docker >/dev/null 2>&1; then
  dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
  dnf -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
else
  dnf -y install docker-compose-plugin || true
fi

systemctl enable --now docker
mkdir -p "__REMOTE_APP_DIR__"

if command -v firewall-cmd >/dev/null 2>&1 && systemctl is-active --quiet firewalld; then
  firewall-cmd --permanent --add-port=80/tcp
  firewall-cmd --permanent --add-port=3000/tcp
  firewall-cmd --permanent --add-port=4002/tcp
  firewall-cmd --permanent --add-port=4003/tcp
  firewall-cmd --reload
fi

docker --version
docker compose version
'@
  $remoteCmd = $remoteCmd.Replace("__REMOTE_APP_DIR__", $Script:RemoteAppDir)
  Invoke-RemoteScript $remoteCmd
}

function Invoke-Upload {
  Write-Step "Packaging project for AWS upload"
  $archivePath = Join-Path $env:TEMP $Script:TmpArchiveName
  if (Test-Path $archivePath) {
    Remove-Item $archivePath -Force
  }

  $includePaths = @(
    "package.json",
    "package-lock.json",
    "pnpm-workspace.yaml",
    "tsconfig.base.json",
    ".dockerignore",
    $Script:ComposeFileName,
    "docker",
    "apps"
  )
  $excludeArgs = @(
    "--exclude=node_modules",
    "--exclude=**/node_modules",
    "--exclude=dist",
    "--exclude=**/dist",
    "--exclude=.vite",
    "--exclude=**/.vite",
    "--exclude=.vite-temp",
    "--exclude=**/.vite-temp",
    "--exclude=*.log",
    "--exclude=*.tsbuildinfo"
  )

  Push-Location $Script:ProjectRoot
  try {
    & tar -czf "$archivePath" @excludeArgs @includePaths
    if ($LASTEXITCODE -ne 0) {
      throw "tar packaging failed."
    }
  }
  finally {
    Pop-Location
  }

  $tempEnvPath = $null
  if ($UploadEnv) {
    Write-Step "Preparing AWS .env.production with public URLs for $($Script:ServerHost)"
    $tempEnvPath = New-AwsEnvFile
    Invoke-Scp $tempEnvPath "$($Script:ServerUser)@$($Script:ServerHost):/tmp/$($Script:TmpEnvName)"
  }

  Write-Step "Uploading package to AWS host"
  Invoke-Scp $archivePath "$($Script:ServerUser)@$($Script:ServerHost):/tmp/$($Script:TmpArchiveName)"

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
set -euo pipefail
REMOTE_APP_DIR="__REMOTE_APP_DIR__"
REMOTE_ENV_FILE="$REMOTE_APP_DIR/__REMOTE_ENV_FILE_NAME__"
INCOMING_DIR="$REMOTE_APP_DIR.__incoming"
ARCHIVE_PATH="/tmp/__TMP_ARCHIVE_NAME__"
UPLOADED_ENV_PATH="/tmp/__TMP_ENV_NAME__"

case "$REMOTE_APP_DIR" in
  ""|"/"|"/root"|"/home"|"/opt")
    echo "Unsafe remote app dir: $REMOTE_APP_DIR"
    exit 1
    ;;
esac

rm -rf "$INCOMING_DIR"
mkdir -p "$INCOMING_DIR"

if [ -f "$UPLOADED_ENV_PATH" ]; then
  cp "$UPLOADED_ENV_PATH" "$INCOMING_DIR/__REMOTE_ENV_FILE_NAME__"
  chmod 600 "$INCOMING_DIR/__REMOTE_ENV_FILE_NAME__"
elif [ -f "$REMOTE_ENV_FILE" ]; then
  cp "$REMOTE_ENV_FILE" "$INCOMING_DIR/__REMOTE_ENV_FILE_NAME__"
fi

__BACKUP_CMD__

tar -xzf "$ARCHIVE_PATH" -C "$INCOMING_DIR"
rm -f "$ARCHIVE_PATH" "$UPLOADED_ENV_PATH"

if [ -d "$REMOTE_APP_DIR" ]; then
  rm -rf "$REMOTE_APP_DIR"
fi
mkdir -p "$REMOTE_APP_DIR"
cp -a "$INCOMING_DIR"/. "$REMOTE_APP_DIR"/
rm -rf "$INCOMING_DIR"
'@
  $remoteCmd = $remoteCmd.
    Replace("__REMOTE_APP_DIR__", $Script:RemoteAppDir).
    Replace("__REMOTE_ENV_FILE_NAME__", $Script:RemoteEnvFileName).
    Replace("__TMP_ARCHIVE_NAME__", $Script:TmpArchiveName).
    Replace("__TMP_ENV_NAME__", $Script:TmpEnvName).
    Replace("__BACKUP_CMD__", $backupCmd)

  Write-Step "Extracting package on AWS host"
  Invoke-RemoteScript $remoteCmd

  Remove-Item $archivePath -Force -ErrorAction SilentlyContinue
  if ($tempEnvPath) {
    Remove-Item $tempEnvPath -Force -ErrorAction SilentlyContinue
  }
  Write-Host "Package uploaded successfully." -ForegroundColor Green
}

function Invoke-Start {
  Write-Step "Starting AWS services"
  if ($Build) {
    $remoteCmd = @"
set -euo pipefail
if [ ! -f "$Script:RemoteEnvFilePath" ]; then
  echo "Missing $Script:RemoteEnvFileName in $Script:RemoteAppDir"
  exit 1
fi
cd "$Script:RemoteAppDir"
cat > "$Script:AwsComposeOverrideFileName" <<'YAML'
services:
  game:
    ports: !override
      - "127.0.0.1:3000:3000"
YAML
for svc in merchant-api api game admin; do
  echo "==> Building `$svc"
  docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" -f "$Script:AwsComposeOverrideFileName" build "`$svc"
done
docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" -f "$Script:AwsComposeOverrideFileName" up -d --remove-orphans
docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" -f "$Script:AwsComposeOverrideFileName" ps
"@
  }
  else {
    $remoteCmd = @"
set -euo pipefail
if [ ! -f "$Script:RemoteEnvFilePath" ]; then
  echo "Missing $Script:RemoteEnvFileName in $Script:RemoteAppDir"
  exit 1
fi
cd "$Script:RemoteAppDir"
cat > "$Script:AwsComposeOverrideFileName" <<'YAML'
services:
  game:
    ports: !override
      - "127.0.0.1:3000:3000"
YAML
docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" -f "$Script:AwsComposeOverrideFileName" up -d --remove-orphans
docker compose --env-file "$Script:RemoteEnvFileName" -f "$Script:ComposeFileName" -f "$Script:AwsComposeOverrideFileName" ps
"@
  }
  Invoke-RemoteScript $remoteCmd
}

function Invoke-Verify {
  Write-Step "Verifying AWS services and local endpoints"
  $remoteCmd = @'
set -euo pipefail
cd "__REMOTE_APP_DIR__"
if [ ! -f "__REMOTE_ENV_FILE_NAME__" ]; then
  echo "Missing __REMOTE_ENV_FILE_NAME__ in __REMOTE_APP_DIR__"
  exit 1
fi

MERCHANT_TOKEN=$(grep '^MERCHANT_API_SERVICE_TOKEN=' "__REMOTE_ENV_FILE_NAME__" | tail -n 1 | cut -d= -f2- | tr -d '\r')
if [ -z "$MERCHANT_TOKEN" ]; then
  MERCHANT_TOKEN="lw-local-dev-merchant-api-service-token"
fi

COMPOSE_ARGS="-f __COMPOSE_FILE_NAME__"
if [ -f "__AWS_COMPOSE_OVERRIDE_FILE_NAME__" ]; then
  COMPOSE_ARGS="$COMPOSE_ARGS -f __AWS_COMPOSE_OVERRIDE_FILE_NAME__"
fi

docker compose --env-file "__REMOTE_ENV_FILE_NAME__" $COMPOSE_ARGS ps
echo "---"

check_http() {
  name="$1"
  url="$2"
  code=$(curl -sS -o /dev/null -w "%{http_code}" "$url")
  printf "%-15s: %s\n" "$name" "$code"
  if [ "$code" != "200" ]; then
    exit 1
  fi
}

check_http "Game HTTP" "http://127.0.0.1:3000/"
check_http "Admin HTTP" "http://127.0.0.1:4002/"
check_http "API HTTP" "http://127.0.0.1:4000/api/v2/config/localization"

merchant_code=$(curl -sS -H "Authorization: Bearer $MERCHANT_TOKEN" -o /dev/null -w "%{http_code}" "http://127.0.0.1:4003/merchant-api/v1/health")
printf "%-15s: %s\n" "Merchant HTTP" "$merchant_code"
if [ "$merchant_code" != "200" ]; then
  exit 1
fi
'@
  $remoteCmd = $remoteCmd.
    Replace("__REMOTE_APP_DIR__", $Script:RemoteAppDir).
    Replace("__REMOTE_ENV_FILE_NAME__", $Script:RemoteEnvFileName).
    Replace("__COMPOSE_FILE_NAME__", $Script:ComposeFileName).
    Replace("__AWS_COMPOSE_OVERRIDE_FILE_NAME__", $Script:AwsComposeOverrideFileName)

  Invoke-RemoteScript $remoteCmd

  Write-Host "Public URLs:" -ForegroundColor Yellow
  Write-Host "  Game        : $($Script:PublicBaseUrl)"
  Write-Host "  Admin       : http://$($Script:ServerHost):4002"
  Write-Host "  Merchant API: http://$($Script:ServerHost):4003/merchant-api/integration/launch"
  Write-Host "Restricted URLs via SSH tunnel or allow-list only:" -ForegroundColor Yellow
  Write-Host "  API  : http://127.0.0.1:4000/api/v2/config/localization"
}

try {
  $hasTask = $Check -or $PrepareServer -or $Upload -or $Start -or $Verify -or $All
  if (-not $hasTask) {
    $Check = $true
  }

  if ($All) {
    $Check = $true
    $PrepareServer = $true
    $Upload = $true
    $UploadEnv = $true
    $Start = $true
    $Build = $true
    $Verify = $true
  }

  if ($Check) {
    Invoke-Check
  }
  if ($PrepareServer) {
    Invoke-PrepareServer
  }
  if ($Upload) {
    Invoke-Upload
  }
  if ($Start) {
    Invoke-Start
  }
  if ($Verify) {
    Invoke-Verify
  }
}
finally {
  Wait-IfRequested (-not $NoPause)
}
