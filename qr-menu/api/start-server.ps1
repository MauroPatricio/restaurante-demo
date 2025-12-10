# Copy environment template
if (-Not (Test-Path .env)) {
    Copy-Item .env.example .env
    Write-Host "✓ Created .env file from template" -ForegroundColor Green
    Write-Host "⚠ Please edit .env and update the configuration values" -ForegroundColor Yellow
} else {
    Write-Host "✓ .env file already exists" -ForegroundColor Green
}

# Check if MongoDB is running
Write-Host "`nChecking MongoDB connection..." -ForegroundColor Cyan
$mongoRunning = $false
try {
    $mongoTest = mongosh --eval "db.version()" --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        $mongoRunning = $true
        Write-Host "✓ MongoDB is running" -ForegroundColor Green
    }
} catch {
    $mongoRunning = $false
}

if (-Not $mongoRunning) {
    Write-Host "✗ MongoDB is not running" -ForegroundColor Red
    Write-Host "  Please start MongoDB before running the server" -ForegroundColor Yellow
    Write-Host "  You can start it with: mongod" -ForegroundColor Yellow
}

# Check if Firebase config exists
if (-Not (Test-Path firebase-config.json)) {
    Write-Host "`n⚠ Firebase config not found" -ForegroundColor Yellow
    Write-Host "  Push notifications will not work without Firebase setup" -ForegroundColor Yellow
    Write-Host "  You can add firebase-config.json later if needed" -ForegroundColor Yellow
} else {
    Write-Host "`n✓ Firebase config found" -ForegroundColor Green
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  QR Menu Restaurant Management System" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if ($mongoRunning) {
    Write-Host "`nStarting server..." -ForegroundColor Green
    npm run dev
} else {
    Write-Host "`nCannot start server - MongoDB is not running" -ForegroundColor Red
    Write-Host "Please start MongoDB and try again" -ForegroundColor Yellow
}
