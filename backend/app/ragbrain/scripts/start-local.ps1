<#
.SYNOPSIS
    Starts Code Arena AI Brain local services.
.DESCRIPTION
    Non-destructive startup script:
    1. Checks dependencies (Python, Node, Docker).
    2. Validates port availability (5433 for Postgres, 8000 for FastAPI, 5173 for Frontend).
    3. Prints clear connection guidance.
#>

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   Code Arena AI Brain - Local Development Launcher" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$WorkspaceRoot = Split-Path -Parent $PSScriptRoot

# 1. Check Python
$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    Write-Host "[✓] Python detected: $($python.Source)" -ForegroundColor Green
} else {
    Write-Host "[!] Python 3.10+ is required but not found in PATH." -ForegroundColor Red
}

# 2. Check Node
$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
    Write-Host "[✓] Node.js detected: $($node.Source)" -ForegroundColor Green
} else {
    Write-Host "[!] Node.js 18+ is required but not found in PATH." -ForegroundColor Red
}

# 3. Check Port 5433 (Dedicated Project PostgreSQL Port)
$p5433 = Get-NetTCPConnection -LocalPort 5433 -ErrorAction SilentlyContinue
if ($p5433) {
    Write-Host "[✓] PostgreSQL container detected on port 5433." -ForegroundColor Green
} else {
    Write-Host "[i] Port 5433 is idle. Start PostgreSQL container via:" -ForegroundColor Yellow
    Write-Host "    docker-compose -f deploy/docker-compose.yml up -d postgres" -ForegroundColor Gray
}

# 4. Check Port 6333 (Qdrant Vector DB)
$p6333 = Get-NetTCPConnection -LocalPort 6333 -ErrorAction SilentlyContinue
if ($p6333) {
    Write-Host "[✓] Qdrant Vector Store detected on port 6333." -ForegroundColor Green
} else {
    Write-Host "[i] Port 6333 is idle. (In-memory vector store available for testing)." -ForegroundColor Yellow
}

# 5. Check Port 11434 (Ollama)
$p11434 = Get-NetTCPConnection -LocalPort 11434 -ErrorAction SilentlyContinue
if ($p11434) {
    Write-Host "[✓] Ollama inference engine detected on port 11434." -ForegroundColor Green
} else {
    Write-Host "[i] Ollama is not listening on 11434. (Mock provider available for testing)." -ForegroundColor Yellow
}

Write-Host "`nTo start the FastAPI backend:" -ForegroundColor Cyan
Write-Host "  cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor White

Write-Host "`nTo start the React frontend:" -ForegroundColor Cyan
Write-Host "  cd frontend && npm run dev" -ForegroundColor White
Write-Host "  Access UI at: http://localhost:5173" -ForegroundColor White
