$ErrorActionPreference = "Stop"
Push-Location $PSScriptRoot
try {
    $configPath = Join-Path $PSScriptRoot "wrangler.jsonc"
    $config = [IO.File]::ReadAllText($configPath)
    if ($config -notmatch '"crons"\s*:\s*\[\s*"\*/5 \* \* \* \*"\s*\]' -and $config -notmatch '"crons"\s*:\s*\[\s*"\* \* \* \* \*"\s*\]') { throw "Unexpected cron configuration. Check wrangler.jsonc before changing it." }
    $config = $config -replace '("crons"\s*:\s*\[\s*")\*/5 \* \* \* \*("\s*\])', '${1}* * * * *${2}'
    [IO.File]::WriteAllText($configPath, $config, (New-Object System.Text.UTF8Encoding($false)))
    & npm ci
    if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
    & npm run deploy
    if ($LASTEXITCODE -ne 0) { throw "Email queue deployment failed." }
    Write-Host "Both email queues now run every minute. Existing payment settings and secrets were preserved."
    Write-Host "Queued does not mean delivered. Check Resend Emails for Delivered, Bounced, Failed or Delayed."
} finally { Pop-Location }
