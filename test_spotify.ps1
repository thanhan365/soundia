$clientId = "9126d12ad200472a9b4bd0c887b74a2d"
$clientSecret = "535f4e2472894f06a371e568a69dec04"
$base64Auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("$($clientId):$($clientSecret)"))

$tokenResponse = Invoke-RestMethod -Uri "https://accounts.spotify.com/api/token" -Method Post -Headers @{"Authorization"="Basic $base64Auth"} -Body @{"grant_type"="client_credentials"}
$token = $tokenResponse.access_token

Write-Output "TOKEN: $token" | Out-File D:\WORKSPACE\soundia\ps_spotify_test.txt

try {
    $searchResponse = Invoke-RestMethod -Uri "https://api.spotify.com/v1/search?q=den&type=artist&market=VN&limit=5" -Method Get -Headers @{"Authorization"="Bearer $token"}
    $searchResponse | ConvertTo-Json -Depth 5 | Out-File D:\WORKSPACE\soundia\ps_spotify_test.txt -Append
} catch {
    $errObj = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($errObj)
    $errResp = $reader.ReadToEnd()
    Write-Output "ERROR: $errResp" | Out-File D:\WORKSPACE\soundia\ps_spotify_test.txt -Append
}
