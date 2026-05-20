# Hybrid Search Deployment Script
# Run this script to deploy hybrid search feature

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Hybrid Search Deployment Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Rebuild backend
Write-Host "[1/4] Rebuilding backend container..." -ForegroundColor Yellow
Write-Host "Note: First build will download ~1.5GB PyTorch + 90MB embedding model" -ForegroundColor Gray
docker-compose build --no-cache backend

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Backend built successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Start services
Write-Host "[2/4] Starting services..." -ForegroundColor Yellow
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Services failed to start!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Services started" -ForegroundColor Green
Write-Host ""

# Step 3: Wait for services to be ready
Write-Host "[3/4] Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

$maxAttempts = 30
$attempt = 0
$backendReady = $false

while (-not $backendReady -and $attempt -lt $maxAttempts) {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $backendReady = $true
        }
    }
    catch {
        $attempt++
        Write-Host "  Waiting for backend... ($attempt/$maxAttempts)" -ForegroundColor Gray
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "❌ Backend not ready after $maxAttempts attempts!" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs backend" -ForegroundColor Yellow
    exit 1
}
Write-Host "✅ Backend is ready" -ForegroundColor Green
Write-Host ""

# Step 4: Re-ingest PDFs with embeddings
Write-Host "[4/4] Re-ingesting PDFs with embeddings..." -ForegroundColor Yellow
Write-Host "Note: First ingestion will download embedding model and take 2-3x longer" -ForegroundColor Gray

try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/api/v1/ingest?force_reindex=true" -Method POST -TimeoutSec 600
    $result = $response.Content | ConvertFrom-Json
    
    Write-Host "✅ Ingestion completed!" -ForegroundColor Green
    Write-Host "  Status: $($result.status)" -ForegroundColor Cyan
    Write-Host "  Message: $($result.message)" -ForegroundColor Cyan
    Write-Host "  Total files: $($result.total_files)" -ForegroundColor Cyan
    Write-Host "  Indexed documents: $($result.indexed_documents)" -ForegroundColor Cyan
}
catch {
    Write-Host "❌ Ingestion failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host "Check logs with: docker-compose logs backend" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Test hybrid search:" -ForegroundColor Cyan
Write-Host "  http://localhost:8000/api/v1/courses/search?q=web%20development" -ForegroundColor White
Write-Host ""
Write-Host "Adjust semantic ratio (0.0-1.0):" -ForegroundColor Cyan
Write-Host "  http://localhost:8000/api/v1/courses/search?q=machine%20learning&semantic_ratio=0.8" -ForegroundColor White
Write-Host ""
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Cyan
Write-Host "API Docs: http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
