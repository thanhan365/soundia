$ErrorActionPreference = 'Stop'
Set-Location -Path 'D:\WORKSPACE\soundia\backend'
try {
    dotnet build backend.csproj > 'D:\WORKSPACE\soundia\ps_build_log.txt' 2>&1
} catch {
    $_.Exception.Message > 'D:\WORKSPACE\soundia\ps_build_log.txt'
}
