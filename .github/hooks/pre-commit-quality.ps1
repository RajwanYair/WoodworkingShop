$ErrorActionPreference = 'Stop'

Write-Host '[hook] Running quality gate...'
$env:NPM_CONFIG_CACHE = Join-Path $env:TEMP 'WoodworkingShop\npm-cache'
New-Item -ItemType Directory -Force -Path $env:NPM_CONFIG_CACHE | Out-Null

npm run quality:fast
if ($LASTEXITCODE -ne 0) {
  Write-Error '[hook] quality:fast failed. Commit aborted.'
}

Write-Host '[hook] Running unit tests...'
npm run test
if ($LASTEXITCODE -ne 0) {
  Write-Error '[hook] test failed. Commit aborted.'
}

Write-Host '[hook] Pre-commit checks passed.'
