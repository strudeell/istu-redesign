# Откат сайта к сохранённой версии — отдельно десктоп, телефон или весь сайт.
#
#   .\rollback.ps1                 список сохранённых версий
#   .\rollback.ps1 mobile v1       телефонная версия — как в v1, десктоп не трогается
#   .\rollback.ps1 desktop v1      десктоп — как в v1, телефонная версия не трогается
#   .\rollback.ps1 all v1          весь сайт — как в v1
#
# Если PowerShell не даёт запускать скрипты:
#   powershell -ExecutionPolicy Bypass -File .\rollback.ps1 mobile v1
#
# Телефонная версия — это css/mobile.css, js/mobile.js и страница «Поступающим»
# (applicants.html, css/applicants.css). Всё остальное в *.html, css/, js/, assets/ — десктоп.
# Откат меняет только файлы в папке. Посмотреть результат — git status, оставить — git commit,
# отменить откат — git restore --staged --worktree -- .

param(
  [ValidateSet('desktop', 'mobile', 'all')] [string] $Part,
  [string] $Version
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $Part) {
  Write-Host 'Сохранённые версии:'
  git tag -n1 --sort=creatordate
  Write-Host ''
  Write-Host 'Откат: .\rollback.ps1 desktop|mobile|all <версия>'
  exit 0
}
if (-not $Version) { Write-Host 'Укажите версию, например: .\rollback.ps1 mobile v1'; exit 1 }

git rev-parse --verify --quiet "$Version^{commit}" > $null
if ($LASTEXITCODE -ne 0) { Write-Host "Версии «$Version» нет. Список: .\rollback.ps1"; exit 1 }

$mobile = @('css/mobile.css', 'js/mobile.js', 'css/applicants.css', 'applicants.html')
$site = @(':(glob)*.html', 'css', 'js', 'assets')

switch ($Part) {
  'mobile'  { $paths = $mobile }
  'desktop' { $paths = $site + ($mobile | ForEach-Object { ":(exclude)$_" }) }
  'all'     { $paths = $site }
}

# Несохранённые правки в этих файлах откат бы стёр — сначала их нужно закоммитить
$dirty = git status --porcelain -- $paths
if ($dirty) {
  Write-Host 'В этих файлах есть несохранённые правки — откат их сотрёт:'
  $dirty | ForEach-Object { Write-Host "  $_" }
  Write-Host 'Сохраните их (git commit) или отмените, затем повторите откат.'
  exit 1
}

git restore --source=$Version --staged --worktree -- $paths
if ($LASTEXITCODE -ne 0) { exit 1 }

Write-Host "Готово: $Part — как в $Version. Изменённые файлы:"
git status --short
