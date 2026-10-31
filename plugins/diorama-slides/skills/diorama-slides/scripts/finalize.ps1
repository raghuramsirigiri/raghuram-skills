<#
  finalize.ps1 - finalize.js for a Windows machine that may not have Node.

    powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\finalize.ps1 <video.html> --stage
    powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\finalize.ps1 <video.html>

  With `node` on PATH this hands straight to finalize.js: same checks, same
  output, same exit code. Without it, it stages, inlines every charts-lib/
  and motion-lib/ script in the page's order (audit.js left out), removes the
  staged copies when they are this skill's, and says the static checks
  (check-video.js) were skipped. Exit codes: 0 shipped (unchecked), 1 failed,
  2 usage. FINALIZE_NO_NODE=1 forces the fallback. Windows PowerShell 5.1+.
#>
$ErrorActionPreference = 'Stop'
$Scripts = $PSScriptRoot

if (-not $env:FINALIZE_NO_NODE -and (Get-Command node -ErrorAction SilentlyContinue)) {
  & node (Join-Path $Scripts 'finalize.js') @args
  exit $LASTEXITCODE
}

$Assets = [IO.Path]::GetFullPath((Join-Path $Scripts '..\assets'))
$stage = $args -contains '--stage'
$target = $args | Where-Object { -not "$_".StartsWith('--') } | Select-Object -First 1
if (-not $target) { [Console]::Error.WriteLine('usage: finalize.ps1 <video.html> [--stage]'); exit 2 }
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { [Console]::Error.WriteLine("no such file: $target"); exit 2 }
$full = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).ProviderPath, $target))
$dir = Split-Path $full
$name = Split-Path $full -Leaf
$utf8 = New-Object Text.UTF8Encoding $false
function Read-Text($p) { [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($p)) }

if ($stage) {
  New-Item -ItemType Directory -Force -Path (Join-Path $dir 'charts-lib'), (Join-Path $dir 'motion-lib\scenes'), (Join-Path $dir 'motion-lib\shapes') | Out-Null
  Copy-Item (Join-Path $Assets 'charts-lib\theme.js') (Join-Path $dir 'charts-lib') -Force
  Copy-Item (Join-Path $Assets 'motion-lib\*.js') (Join-Path $dir 'motion-lib') -Force
  Copy-Item (Join-Path $Assets 'motion-lib\scenes\*.js') (Join-Path $dir 'motion-lib\scenes') -Force
  Copy-Item (Join-Path $Assets 'motion-lib\shapes\*.js') (Join-Path $dir 'motion-lib\shapes') -Force
  Write-Output "staged charts-lib/ and motion-lib/ beside $name - open the page over http and run the audit (SKILL.md step 7)."
  [Console]::Error.WriteLine('note: Node was not found, so check-video.js cannot run on this machine.')
  exit 0
}

$html = Read-Text $full
$re = [regex]'<script src="(charts-lib|motion-lib)/([\w\-/.]+\.js)"></script>\n?'
$failed = $false; $count = 0
$html = $re.Replace($html, {
  param($m)
  $lib = $m.Groups[1].Value; $rel = $m.Groups[2].Value
  if ($rel -eq 'audit.js') { return '' }
  $src = Join-Path (Join-Path $Assets $lib) ($rel -replace '/', '\')
  if (-not (Test-Path -LiteralPath $src)) { [Console]::Error.WriteLine("cannot inline $lib/$rel"); $script:failed = $true; return $m.Value }
  $code = Read-Text $src
  if ($code -match '</script') { [Console]::Error.WriteLine("refusing to inline ${rel}: it contains a literal </script"); $script:failed = $true; return $m.Value }
  $script:count++
  return "<script>`n" + $code.TrimEnd() + "`n</script>`n"
})
if ($failed) { exit 1 }
if ($count) { [IO.File]::WriteAllText($full, $html, $utf8); Write-Output "${name}: inlined $count files, standalone" }
else { Write-Output "${name}: already standalone, nothing to inline" }

$charts = Join-Path $dir 'charts-lib'
if ((Test-Path $charts) -and (@(Get-ChildItem $charts -Force | ForEach-Object Name) -join ' ') -ceq 'theme.js') {
  Remove-Item $charts -Recurse -Force; Write-Output 'removed the staged charts-lib/'
}
$motion = Join-Path $dir 'motion-lib'
if (Test-Path $motion) {
  $theirs = Get-ChildItem $motion -Recurse -File | Where-Object {
    -not (Test-Path (Join-Path (Join-Path $Assets 'motion-lib') $_.FullName.Substring($motion.Length + 1)))
  }
  if (-not $theirs) { Remove-Item $motion -Recurse -Force; Write-Output 'removed the staged motion-lib/' }
  else { Write-Output 'left motion-lib/ alone: it holds files this skill does not stage.' }
}
[Console]::Error.WriteLine('UNCHECKED: Node was not found, so check-video.js did not run - the page is standalone but its static checks were skipped. Say so when you hand it over.')
exit 0
