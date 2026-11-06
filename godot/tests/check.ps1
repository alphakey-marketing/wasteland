param([Parameter(Mandatory=$true)][string]$Godot)
$projectRoot = Split-Path $PSScriptRoot -Parent
& $Godot --headless --path $projectRoot --editor --import --quit
if ($LASTEXITCODE -ne 0) { throw 'Godot import failed' }
$result = & $Godot --headless --path $projectRoot -- --verify 2>&1
$result | Write-Output
if ($LASTEXITCODE -ne 0 -or ($result -match 'SCRIPT ERROR|ERROR:') -or -not ($result -match 'VERIFY PASS')) {
    throw 'Godot verification failed'
}
