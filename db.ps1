#!/bin/pwsh

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

function Start-Database {
    Write-Host "Starting PostgreSQL database..."
    docker-compose up -d postgres
    Write-Host "Database started on localhost:5432"
    Write-Host "  Username: oneexam"
    Write-Host "  Password: oneexam"
    Write-Host "  Database: oneexam"
}

function Stop-Database {
    Write-Host "Stopping PostgreSQL database..."
    docker-compose down
}

function Show-Logs {
    docker-compose logs -f postgres
}

function Reset-Database {
    Write-Host "Resetting PostgreSQL database..."
    docker-compose down -v
    docker-compose up -d postgres
    Write-Host "Database has been reset and restarted"
}

function Connect-Database {
    Write-Host "Connecting to PostgreSQL database with psql..."
    docker exec -it one-exam-postgres psql -U oneexam -d oneexam
}

function Show-Help {
    Write-Host "Database management script for One Exam project"
    Write-Host ""
    Write-Host "Usage: ./db.ps1 [command]"
    Write-Host ""
    Write-Host "Commands:"
    Write-Host "  start    - Start the PostgreSQL database"
    Write-Host "  stop     - Stop the PostgreSQL database"
    Write-Host "  logs     - Show database logs"
    Write-Host "  reset    - Reset the database (warning: deletes all data)"
    Write-Host "  connect  - Connect to the database with psql"
    Write-Host "  help     - Show this help message"
}

# Execute command
switch ($Command.ToLower()) {
    "start" { Start-Database }
    "stop" { Stop-Database }
    "logs" { Show-Logs }
    "reset" { Reset-Database }
    "connect" { Connect-Database }
    default { Show-Help }
}
