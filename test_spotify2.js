const fs = require('fs');
const https = require('https');

const clientId = "9126d12ad200472a9b4bd0c887b74a2d";
const clientSecret = "535f4e2472894f06a371e568a69dec04";

async function run() {
  const authString = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  const tokenOpts = {
    hostname: 'accounts.spotify.com',
    port: 443,
    path: '/api/token',
    method: 'POST',
    headers: {
      'Authorization': `Basic ${authString}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  const req = https.request(tokenOpts, (res) => {
    let raw = '';
    res.on('data', c => raw += c);
    res.on('end', () => {
      const token = JSON.parse(raw).access_token;
      fs.writeFileSync("spotify_log.txt", "TOKEN: " + token + "\n");
      
      const searchOpts = {
        hostname: 'api.spotify.com',
        path: '/v1/search?q=' + encodeURIComponent('đen vâu') + '&type=track,artist&limit=10',
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      };
      const searchReq = https.request(searchOpts, (searchRes) => {
        let searchRaw = '';
        searchRes.on('data', c => searchRaw += c);
        searchRes.on('end', () => {
           fs.appendFileSync("spotify_log.txt", "STATUS: " + searchRes.statusCode + "\nDATA: " + searchRaw);
        });
      });
      searchReq.end();
    });
  });
  
  req.write('grant_type=client_credentials');
  req.end();
}

run();
