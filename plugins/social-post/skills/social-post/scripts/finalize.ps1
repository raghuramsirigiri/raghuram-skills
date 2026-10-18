<#
  finalize.ps1 - finalize.js for a Windows machine that may not have Node.

    powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\finalize.ps1 <page.html> --stage
    powershell -ExecutionPolicy Bypass -File <skill-dir>\scripts\finalize.ps1 <page.html>

  With `node` on PATH this hands straight to finalize.js: same checks, same
  output, same exit code. Without it, it does every step that needs no
  JavaScript, byte for byte the way finalize.js does them - stage, inline,
  remove the staged copy, split an editable page - confirms no `charts-lib/`
  reference is left, and says the static checks (check-page.js) were skipped.
  Exit codes: 0 shipped (unchecked), 1 failed, 2 usage.

  finalize.sh is the same fallback for sh. FINALIZE_NO_NODE=1 forces the
  fallback (for tests). Works on Windows PowerShell 5.1 and PowerShell 7.
#>
$ErrorActionPreference = 'Stop'
$Scripts = $PSScriptRoot

if (-not $env:FINALIZE_NO_NODE -and (Get-Command node -ErrorAction SilentlyContinue)) {
  & node (Join-Path $Scripts 'finalize.js') @args
  exit $LASTEXITCODE
}

$Assets = [IO.Path]::GetFullPath((Join-Path $Scripts '..\assets'))
$Lib = Join-Path $Assets 'charts-lib'
$stage = $args -contains '--stage'
$target = $args | Where-Object { -not "$_".StartsWith('--') } | Select-Object -First 1
if (-not $target) { [Console]::Error.WriteLine('usage: finalize.ps1 <page.html> [--stage]'); exit 2 }
if (-not (Test-Path -LiteralPath $target -PathType Leaf)) { [Console]::Error.WriteLine("no such file: $target"); exit 2 }

$full = [IO.Path]::GetFullPath([IO.Path]::Combine((Get-Location).ProviderPath, $target))
$staged = Join-Path (Split-Path $full) 'charts-lib'
$name = Split-Path $full -Leaf
# Read and write raw UTF-8 without adding or dropping a BOM, the way Node does.
$utf8 = New-Object Text.UTF8Encoding $false
function Read-Text($p) { [Text.Encoding]::UTF8.GetString([IO.File]::ReadAllBytes($p)) }
function Write-Text($p, $s) { [IO.File]::WriteAllText($p, $s, $utf8) }
$skipped = 'Node was not found, so check-page.js did not run'

# -- stage: put the library beside the page so it can be opened
if ($stage) {
  New-Item -ItemType Directory -Force -Path $staged | Out-Null
  foreach ($f in 'charts.css', 'charts.js', 'theme.js') { Copy-Item -LiteralPath (Join-Path $Lib $f) -Destination $staged -Force }
  foreach ($f in 'chart-convert.js', 'page-runtime.js', 'page-editor.js', 'email-snapshot.js', 'audit.js') {
    Copy-Item -LiteralPath (Join-Path $Assets $f) -Destination $staged -Force
  }
  Write-Output "staged charts-lib/ beside $name - open the page and run the audit in it (charts-lib/audit.js; see SKILL.md step 7), then run this without --stage to ship it."
  [Console]::Error.WriteLine("note: $skipped and cannot run on this machine.")
  exit 0
}

# -- 1. fold the library into the page (inline-lib.js)
$targets = @(
  @('<link rel="stylesheet" href="charts-lib/charts.css">', (Join-Path $Lib 'charts.css'), '<style>', '</style>', '</style'),
  @('<script src="charts-lib/theme.js"></script>', (Join-Path $Lib 'theme.js'), '<script>', '</script>', '</script'),
  @('<script src="charts-lib/charts.js"></script>', (Join-Path $Lib 'charts.js'), '<script>', '</script>', '</script')
)
foreach ($f in 'chart-convert.js', 'page-runtime.js', 'page-editor.js', 'email-snapshot.js') {
  $targets += , @("<script src=`"charts-lib/$f`"></script>", (Join-Path $Assets $f), '<script>', '</script>', '</script')
}
$html = Read-Text $full
$done = 0
foreach ($t in $targets) {
  $i = $html.IndexOf($t[0], [StringComparison]::Ordinal)
  if ($i -lt 0) { continue }
  $src = Read-Text $t[1]
  if ($src.IndexOf($t[4], [StringComparison]::Ordinal) -ge 0) {
    [Console]::Error.WriteLine("refusing to inline $(Split-Path $t[1] -Leaf): it contains a literal $($t[4])"); exit 1
  }
  $html = $html.Substring(0, $i) + $t[2] + "`n" + $src + "`n" + $t[3] + $html.Substring($i + $t[0].Length)
  $done++
}
if ($done) {
  Write-Text $full $html
  Write-Output "${name}: inlined $done file(s) -> $([Math]::Round($utf8.GetByteCount($html) / 1024)) KB, standalone"
} else {
  Write-Output "${name}: already standalone, nothing to inline"
}

# -- 2. the one --final check that needs no JavaScript
$left = Select-String -LiteralPath $full -Pattern '(src|href)="charts-lib/' -CaseSensitive
if ($left) {
  [Console]::Error.WriteLine("$name still references charts-lib/ after inlining:")
  $left | ForEach-Object { [Console]::Error.WriteLine("$($_.LineNumber): $($_.Line)") }
  exit 1
}

# -- 3. remove the staged copy, if it is ours to remove
if (Test-Path -LiteralPath $staged -PathType Container) {
  $sorted = { param($names) $a = [string[]]@($names); [Array]::Sort($a, [StringComparer]::Ordinal); $a -join ' ' }
  $found = & $sorted (Get-ChildItem -LiteralPath $staged -Force | ForEach-Object Name)
  $L = 'charts.css', 'charts.js', 'theme.js'
  $E = 'chart-convert.js', 'page-runtime.js', 'page-editor.js'
  $sets = @($L, ($L + 'page-runtime.js'), ($L + 'chart-convert.js', 'page-runtime.js'), ($L + $E),
            ($L + $E + 'audit.js'), ($L + $E + 'email-snapshot.js', 'audit.js'))
  if ($sets | Where-Object { (& $sorted $_) -ceq $found }) {
    Remove-Item -LiteralPath $staged -Recurse -Force
    Write-Output 'removed the staged charts-lib/ - nothing references it now.'
  } else {
    Write-Output "left charts-lib/ alone: it holds $($found -replace ' ', ', '), which is not what this skill stages. Delete it yourself if it is a leftover."
  }
}

# -- 4. an editable page ships as two files (see finalize.js step 5)
$editor = [regex]'<script>\s*/\*!\s*\n\s*\*\s*page-editor\.js[\s\S]*?</script>\s*'
$shipped = Read-Text $full
if ($editor.IsMatch($shipped)) {
  $ext = [IO.Path]::GetExtension($full)
  $base = $full.Substring(0, $full.Length - $ext.Length) -replace ' \(working copy\)$', ''
  $working = "$base (working copy)$ext"; $final = "$base$ext"
  Write-Text $working $shipped
  $fin = $editor.Replace($shipped, '', 1)
  if ($fin -cnotmatch '<meta name="page-edition"') {
    $fin = ([regex]'(?i)<head>').Replace($fin, "<head>`n<meta name=`"page-edition`" content=`"final`">", 1)
  }
  Write-Text $final $fin
  if ($full -ne $final -and $full -ne $working) { Remove-Item -LiteralPath $full }
  Write-Output "editable page: wrote $(Split-Path $final -Leaf) (final, to share) and $(Split-Path $working -Leaf) (editable working copy)"
}

[Console]::Error.WriteLine("UNCHECKED: $skipped - the page is standalone but its static checks were skipped. Say so when you hand it over.")
exit 0
