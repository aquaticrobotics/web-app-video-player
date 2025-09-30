# PowerShell script to download face detection models

$baseUrl = "https://raw.githubusercontent.com/vladmandic/face-api/master/model"
$modelsDir = "..\models"

Write-Host "📥 Downloading face detection models..." -ForegroundColor Cyan

# Ensure models directory exists
if (-not (Test-Path $modelsDir)) {
    New-Item -ItemType Directory -Path $modelsDir | Out-Null
}

# List of files to download
$files = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

$downloaded = 0
$failed = 0

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $output = Join-Path $modelsDir $file
    
    Write-Host "  Downloading $file..." -NoNewline
    
    try {
        Invoke-WebRequest -Uri $url -OutFile $output -UseBasicParsing
        Write-Host " OK" -ForegroundColor Green
        $downloaded++
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
        $failed++
    }
}

Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  Downloaded: $downloaded files" -ForegroundColor Green
if ($failed -gt 0) {
    Write-Host "  Failed: $failed files" -ForegroundColor Red
}

if ($downloaded -eq $files.Count) {
    Write-Host ""
    Write-Host "All models downloaded successfully!" -ForegroundColor Green
    Write-Host "Face detection is now ready to use." -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "Some files failed to download." -ForegroundColor Yellow
    Write-Host "Please check your internet connection and try again." -ForegroundColor Yellow
}