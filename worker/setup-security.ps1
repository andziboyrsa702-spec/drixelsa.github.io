$ErrorActionPreference = "Stop"
$projectRoot = Split-Path $PSScriptRoot -Parent
Push-Location $projectRoot
try {
    Write-Host "Publishing the administrator passkey Firestore rules first."
    & npx firebase deploy --only "firestore:rules" --project drixel-sa
    if ($LASTEXITCODE -ne 0) { throw "Rules were not deployed. Passkey enrollment remains disabled." }
    Write-Host "Installing the verified Worker dependencies."
    & npm --prefix worker ci
    if ($LASTEXITCODE -ne 0) { throw "Worker dependencies were not installed." }
    Push-Location $PSScriptRoot
    try {
        "true" | & npx wrangler secret put ADMIN_PASSKEYS_ENABLED
        if ($LASTEXITCODE -ne 0) { throw "Passkey enrollment could not be enabled." }
        & npm run deploy
        if ($LASTEXITCODE -ne 0) { throw "The Worker was not deployed." }
    } finally { Pop-Location }
    Write-Host "Open https://drixelsa.co.za/za/admin, sign in again, register your passkey and save the recovery codes privately."
    Write-Host "Device verification may use Face ID, Windows Hello, fingerprint or a PIN. Drixel never receives a face photo."
} finally { Pop-Location }
