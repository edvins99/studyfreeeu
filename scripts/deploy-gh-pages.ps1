param(
  [string]$SiteRoot = "C:\Users\user\.openclaw-autoclaw\workspace\projects\website-8ccfbe4126ddbf44b2f2aeb8",
  [string]$Remote = "https://github.com/edvins99/studyfreeeu.git"
)
$ErrorActionPreference = "Stop"
$dst = Join-Path $env:TEMP "studyfreeeu-gh-pages"
if (Test-Path $dst) { Remove-Item $dst -Recurse -Force }
New-Item -ItemType Directory -Path $dst | Out-Null
robocopy $SiteRoot $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
Push-Location $dst
git init 2>$null
git checkout -B gh-pages
git config user.name "StudyFreeEU Deploy"
git config user.email "deploy@studyfreeeu.local"
git add -A
git commit -m "Deploy built site $(Get-Date -Format s)"
if (git remote | Select-String origin) { git remote set-url origin $Remote } else { git remote add origin $Remote }
git push origin gh-pages --force
Pop-Location
Write-Host "gh-pages updated."
