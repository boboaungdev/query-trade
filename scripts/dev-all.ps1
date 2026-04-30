param(
    [switch]$Preview
)

$repoRoot = Split-Path -Parent $PSScriptRoot

$projects = @(
    @{ Name = "query-trade web-app"; Path = Join-Path $repoRoot "web-app"; Command = "npm.cmd run dev" },
    @{ Name = "query-trade server"; Path = Join-Path $repoRoot "server"; Command = "npm.cmd run dev" },
    @{ Name = "query-trade web-site"; Path = Join-Path $repoRoot "web-site"; Command = "npm.cmd run dev" }
)

foreach ($project in $projects) {
    $launchCommand = "Set-Location -LiteralPath '$($project.Path)'; `$Host.UI.RawUI.WindowTitle = '$($project.Name)'; $($project.Command)"

    if ($Preview) {
        Write-Host "Would launch $($project.Name) in $($project.Path)"
        continue
    }

    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-Command", $launchCommand
    ) -WorkingDirectory $project.Path
}
