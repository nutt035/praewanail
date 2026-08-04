param(
  [string]$SshHost = "server",
  [string]$PublicUrl = "https://antoinette-nail.zsunnx.online"
)

$ErrorActionPreference = "Stop"

function Assert-ExitCode([string]$CheckName) {
  if ($LASTEXITCODE -ne 0) {
    throw "$CheckName failed with exit code $LASTEXITCODE"
  }
}

Write-Host "Checking the public website..."
$publicStatus = curl.exe --silent --show-error --output NUL --write-out "%{http_code}" "$PublicUrl/"
Assert-ExitCode "Public website check"
if ($publicStatus -ne "200") {
  throw "Public website returned HTTP $publicStatus"
}

Write-Host "Checking the production container..."
ssh $SshHost "docker inspect --format='{{.State.Running}}' antonette-nail | grep -qx true"
Assert-ExitCode "Container state check"

Write-Host "Checking Next.js from inside the container..."
$internalStatus = ssh $SshHost "docker exec antonette-nail curl -sS -o /dev/null -w '%{http_code}' http://127.0.0.1:3000/"
Assert-ExitCode "Internal website check"
if ($internalStatus.Trim() -ne "200") {
  throw "Internal website returned HTTP $($internalStatus.Trim())"
}

Write-Host "Checking recent fatal startup errors..."
$fatalErrors = ssh $SshHost "docker logs --since 5m antonette-nail 2>&1 | grep -Eic 'uncaught|fatal|failed to start' || true"
Assert-ExitCode "Recent log check"
if ([int]$fatalErrors.Trim() -gt 0) {
  throw "Recent application logs contain fatal startup errors"
}

Write-Host "Production health check passed. No customer data was changed."
