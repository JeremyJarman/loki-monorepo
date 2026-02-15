# Sync loki-admin (current app) into loki-monorepo/apps/admin
# Run from: c:\Dev\loki-admin
# Excludes node_modules and .next so monorepo keeps its own installs

$source = "c:\Dev\loki-admin"
$dest  = "c:\Dev\loki-monorepo\apps\admin"

$exclude = @("node_modules", ".next", ".git")
$excludeArgs = $exclude | ForEach-Object { "/XD", $_ }

robocopy $source $dest /E /IS /IT /XD node_modules .next .git /NFL /NDL /NJH /NJS

if ($LASTEXITCODE -le 7) {
    Write-Host "Sync complete. Run 'npm install' in c:\Dev\loki-monorepo if needed."
} else {
    Write-Host "Robocopy exit code: $LASTEXITCODE (0-7 = success)"
}
