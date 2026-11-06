param([Parameter(Mandatory=$true)][string]$Godot)
$projectRoot = Split-Path $PSScriptRoot -Parent
function Invoke-Check([string[]]$Arguments, [string]$Marker = '') {
    $result = & $Godot --headless --path $projectRoot @Arguments 2>&1
    $result | Write-Output
    if ($LASTEXITCODE -ne 0 -or ($result -match 'SCRIPT ERROR|ERROR:|Parse Error') -or ($Marker -and -not ($result -match $Marker))) {
        throw "Godot check failed: $Arguments"
    }
}
Invoke-Check -Arguments @('--editor', '--import', '--quit')
Invoke-Check -Arguments @('--fixed-fps', '60', '--script', 'res://addons/gut/gut_cmdln.gd', '-gdir=res://tests', '-gexit') -Marker 'All tests passed'
Invoke-Check -Arguments @('res://scenes/lab.tscn', '--', '--verify') -Marker 'VERIFY PASS'
Invoke-Check -Arguments @('--', '--smoke') -Marker 'BATTLE SMOKE PASS'
