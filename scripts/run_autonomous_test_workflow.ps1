param(
  [switch]$IncludeStress,
  [switch]$SkipBackend,
  [switch]$SkipFrontend,
  [switch]$InstallClientDeps,
  [int]$Iterations = 1,
  [switch]$ContinueOnFailure
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Resolve-Path (Join-Path $scriptDir "..")
Set-Location $repoRoot

$argsList = @("scripts/run_autonomous_test_workflow.py", "--iterations", "$Iterations")

if ($IncludeStress) { $argsList += "--include-stress" }
if ($SkipBackend) { $argsList += "--skip-backend" }
if ($SkipFrontend) { $argsList += "--skip-frontend" }
if ($InstallClientDeps) { $argsList += "--install-client-deps" }
if ($ContinueOnFailure) { $argsList += "--continue-on-failure" }

python @argsList
exit $LASTEXITCODE
