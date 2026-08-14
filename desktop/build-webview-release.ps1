param(
    [string]$ReleaseRoot,
    [switch]$SkipInstaller
)

$ErrorActionPreference = "Stop"
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
if ([string]::IsNullOrWhiteSpace($ReleaseRoot)) {
    $ReleaseRoot = Join-Path (Split-Path $projectRoot -Parent) "IELTS-Speaking-WebView2-v0.6.0-Release"
}
$ReleaseRoot = [IO.Path]::GetFullPath($ReleaseRoot)
if ($ReleaseRoot.StartsWith($projectRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw "ReleaseRoot must be outside the repository: $projectRoot"
}

$appStage = Join-Path $ReleaseRoot "AppStage"
$backendStage = Join-Path $ReleaseRoot "BackendStage"
$buildRoot = Join-Path $ReleaseRoot "Build"
foreach ($target in @($appStage, $backendStage, $buildRoot)) {
    if (Test-Path -LiteralPath $target) {
        Remove-Item -LiteralPath $target -Recurse -Force
    }
    New-Item -ItemType Directory -Path $target | Out-Null
}

Push-Location (Join-Path $projectRoot "frontend")
try {
    & npm.cmd run build
    if ($LASTEXITCODE -ne 0) { throw "Frontend build failed with exit code $LASTEXITCODE" }
}
finally {
    Pop-Location
}

$backendRoot = Join-Path $projectRoot "backend"
$pythonCandidates = @(
    (Join-Path $backendRoot "venv\Scripts\python.exe"),
    (Join-Path $backendRoot "venv-whisperx\Scripts\python.exe")
)
$python = $pythonCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (-not $python) { throw "No backend virtual-environment Python was found." }

& $python -m PyInstaller --noconfirm --clean `
    --distpath $backendStage `
    --workpath (Join-Path $buildRoot "PyInstaller") `
    (Join-Path $backendRoot "IELTS Speaking Backend.spec")
if ($LASTEXITCODE -ne 0) { throw "Backend packaging failed with exit code $LASTEXITCODE" }

& dotnet publish (Join-Path $projectRoot "desktop\IELTSSpeaking.Desktop\IELTSSpeaking.Desktop.csproj") `
    --configuration Release `
    --runtime win-x64 `
    --self-contained true `
    --output $appStage
if ($LASTEXITCODE -ne 0) { throw "Desktop publish failed with exit code $LASTEXITCODE" }

$backendOutput = Join-Path $backendStage "IELTS Speaking Backend"
if (-not (Test-Path -LiteralPath (Join-Path $backendOutput "IELTS Speaking Backend.exe"))) {
    throw "Packaged backend executable was not produced."
}
Copy-Item -LiteralPath $backendOutput -Destination (Join-Path $appStage "backend") -Recurse

foreach ($document in @("DISCLAIMER.md", "PRIVACY.md", "NOTICE.md", "LICENSE", "README.md")) {
    Copy-Item -LiteralPath (Join-Path $projectRoot $document) -Destination $appStage
}

Write-Host "WebView2 application staged at: $appStage"

if (-not $SkipInstaller) {
    $prerequisiteDirectory = Join-Path $ReleaseRoot "Prerequisites"
    New-Item -ItemType Directory -Path $prerequisiteDirectory -Force | Out-Null
    $webView2Bootstrapper = Join-Path $prerequisiteDirectory "MicrosoftEdgeWebview2Setup.exe"
    if (-not (Test-Path -LiteralPath $webView2Bootstrapper)) {
        Invoke-WebRequest `
            -Uri "https://go.microsoft.com/fwlink/p/?LinkId=2124703" `
            -OutFile $webView2Bootstrapper `
            -UseBasicParsing
    }

    $innoCandidates = @(
        "C:\Program Files\Inno Setup 7\ISCC.exe",
        "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
        "C:\Program Files\Inno Setup 6\ISCC.exe",
        (Join-Path $env:LOCALAPPDATA "Programs\Inno Setup 6\ISCC.exe")
    )
    $innoCompiler = $innoCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $innoCompiler) {
        throw "Inno Setup compiler was not found. Use -SkipInstaller to stage only the application."
    }
    & $innoCompiler (Join-Path $projectRoot "setup.iss")
    if ($LASTEXITCODE -ne 0) { throw "Installer build failed with exit code $LASTEXITCODE" }
    Write-Host "Installer created under: $(Join-Path $ReleaseRoot 'Installer')"
}
