param(
  [switch]$SkipSshCheck,
  [switch]$NoPause
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot\deploy.config.ps1"

function Write-Step($Message) {
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Assert-Command($Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command not found: $Name"
  }
}

function Fix-SshKeyPermissions($KeyPath) {
  Write-Step "Fixing SSH key ACL for current machine user"
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

function Invoke-SshProbe($KeyPath, $User, $HostName) {
  $cmd = "ssh -i `"$KeyPath`" $User@$HostName `"echo SSH_OK`""
  $output = $null
  $exitCode = 0
  $text = ""
  try {
    $output = & cmd /c $cmd 2>&1
    $exitCode = $LASTEXITCODE
    $text = ($output | Out-String)
  }
  catch {
    $exitCode = 255
    $text = ($_ | Out-String)
  }
  return @{
    ExitCode = $exitCode
    Text = $text
  }
}

try {
  Write-Step "Checking local prerequisites"
  Assert-Command "ssh"
  Assert-Command "scp"
  Assert-Command "tar"

  Write-Step "Checking repository files"
  if (-not (Test-Path $Script:ComposeFilePath)) {
    throw "Docker Compose file not found in project root: $Script:ComposeFilePath"
  }
  if (-not (Test-Path $Script:SshKeyPath)) {
    throw "SSH key not found: $Script:SshKeyPath"
  }

  if (-not $SkipSshCheck) {
    Write-Step "Testing SSH access with project key"
    $probe = Invoke-SshProbe -KeyPath $Script:SshKeyPath -User $Script:ServerUser -HostName $Script:ServerHost
    $sshText = $probe.Text

    if ($probe.ExitCode -ne 0 -and $sshText -match "UNPROTECTED PRIVATE KEY FILE|bad permissions") {
      Fix-SshKeyPermissions -KeyPath $Script:SshKeyPath
      Write-Step "Retrying SSH test after key permission fix"
      $probe = Invoke-SshProbe -KeyPath $Script:SshKeyPath -User $Script:ServerUser -HostName $Script:ServerHost
      $sshText = $probe.Text
    }

    if ($probe.ExitCode -ne 0 -or $sshText -notmatch "SSH_OK") {
      throw "SSH test failed. Output:`n$sshText"
    }
  }

  Write-Host "Prerequisite check passed." -ForegroundColor Green
}
finally {
  Wait-IfRequested (-not $NoPause)
}
