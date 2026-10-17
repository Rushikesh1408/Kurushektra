<#
.SYNOPSIS
    Gracefully stops local services without deleting database volumes.
.DESCRIPTION
    Stops docker compose containers while preserving persistent volumes.
#>

Write-Host "Gracefully stopping Code Arena AI Brain local containers..." -ForegroundColor Cyan

docker-compose -f deploy/docker-compose.yml stop

Write-Host "Containers stopped. Data volumes preserved." -ForegroundColor Green
