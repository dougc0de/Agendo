param(
    [switch]$DryRun,
    [switch]$IncludeSeed
)

$ErrorActionPreference = "Stop"

function Import-DotEnvFile {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Path
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        return
    }

    foreach ($rawLine in Get-Content -LiteralPath $Path) {
        $line = [string]$rawLine

        if ([string]::IsNullOrWhiteSpace($line)) {
            continue
        }

        $trimmedLine = $line.Trim()

        if ($trimmedLine.StartsWith("#")) {
            continue
        }

        $parts = $trimmedLine -split "=", 2

        if ($parts.Count -ne 2) {
            continue
        }

        $name = $parts[0].Trim()
        $value = $parts[1].Trim()

        if (
            ($value.StartsWith('"') -and $value.EndsWith('"')) -or
            ($value.StartsWith("'") -and $value.EndsWith("'"))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        [Environment]::SetEnvironmentVariable($name, $value, "Process")
    }
}

function Get-SafeDbTarget {
    param(
        [Parameter(Mandatory = $true)]
        [string]$ConnectionString
    )

    try {
        $uri = [System.Uri]$ConnectionString
        $database = $uri.AbsolutePath.TrimStart("/")

        if ([string]::IsNullOrWhiteSpace($database)) {
            $database = "postgres"
        }

        return "$($uri.Host)/$database"
    } catch {
        return "destino no reconocido"
    }
}

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDirectory
$envFilePath = Join-Path $repoRoot ".env"
$dockerConfigPath = Join-Path $repoRoot ".docker-config"
$dockerConfigFile = Join-Path $dockerConfigPath "config.json"

Import-DotEnvFile -Path $envFilePath

$dbUrl = [Environment]::GetEnvironmentVariable("SUPABASE_DB_URL", "Process")

if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    throw "Falta SUPABASE_DB_URL. Define esa variable en .env o en el entorno antes de ejecutar el push."
}

New-Item -ItemType Directory -Path $dockerConfigPath -Force | Out-Null

if (-not (Test-Path -LiteralPath $dockerConfigFile)) {
    Set-Content -LiteralPath $dockerConfigFile -Value "{}" -NoNewline
}

$env:DOCKER_CONFIG = $dockerConfigPath

$arguments = @(
    "supabase",
    "db",
    "push",
    "--db-url",
    $dbUrl
)

if ($DryRun) {
    $arguments += "--dry-run"
}

if ($IncludeSeed) {
    $arguments += "--include-seed"
}

$modeLabel = if ($DryRun) { "DRY RUN remoto" } else { "push remoto" }
$safeTarget = Get-SafeDbTarget -ConnectionString $dbUrl

Write-Host "[Agendo] Ejecutando $modeLabel via SUPABASE_DB_URL"
Write-Host "[Agendo] Destino: $safeTarget"

Push-Location $repoRoot

try {
    & npx @arguments

    if ($LASTEXITCODE -ne 0) {
        exit $LASTEXITCODE
    }
} finally {
    Pop-Location
}
