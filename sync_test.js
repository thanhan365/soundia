const { execSync } = require('child_process');
const fs = require('fs');

try {
  const curlCmd = `curl -s -X POST "https://accounts.spotify.com/api/token" -H "Content-Type: application/x-www-form-urlencoded" -d "grant_type=client_credentials&client_id=9126d12ad200472a9b4bd0c887b74a2d&client_secret=535f4e2472894f06a371e568a69dec04"`;
  const result = execSync(curlCmd).toString();
  
  const token = JSON.parse(result).access_token;
  if (!token) {
     fs.writeFileSync('D:\\WORKSPACE\\soundia\\SYNC_LOG.txt', "ERROR NO TOKEN: " + result);
     process.exit(1);
  }
  
  const searchCmd = `curl -s -X GET "https://api.spotify.com/v1/search?q=den&type=artist&market=VN&limit=5" -H "Authorization: Bearer ${token}"`;
  const searchResult = execSync(searchCmd).toString();
  
  fs.writeFileSync('D:\\WORKSPACE\\soundia\\SYNC_LOG.txt', "SEARCH RESULT:\n" + searchResult);
} catch (e) {
  fs.writeFileSync('D:\\WORKSPACE\\soundia\\SYNC_LOG.txt', "CATCH FATAL:\n" + e.message + "\n" + (e.stdout ? e.stdout.toString() : ''));
}
