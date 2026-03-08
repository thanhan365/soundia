const https = require('https');
const fs = require('fs');

process.on('uncaughtException', err => fs.writeFileSync('D:\\WORKSPACE\\soundia\\spotify_err.txt', err.stack));
process.on('unhandledRejection', reason => fs.writeFileSync('D:\\WORKSPACE\\soundia\\spotify_err.txt', String(reason)));

const clientId = '9126d12ad200472a9b4bd0c887b74a2d';
const clientSecret = '535f4e2472894f06a371e568a69dec04';

const authOptions = {
  hostname: 'accounts.spotify.com',
  path: '/api/token',
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const req = https.request(authOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    fs.writeFileSync('D:\\WORKSPACE\\soundia\\spotify_log.txt', "TOKEN STATUS: " + res.statusCode + "\nBODY: " + body);
    try {
      const parsed = JSON.parse(body);
      const token = parsed.access_token;
      if (!token) return;
      
      const searchOptions = {
        hostname: 'api.spotify.com',
        path: '/v1/search?q=den&type=track,artist&market=VN&limit=5',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + token }
      };
      const sReq = https.request(searchOptions, (sRes) => {
        let sBody = '';
        sRes.on('data', c => sBody += c);
        sRes.on('end', () => {
           fs.appendFileSync('D:\\WORKSPACE\\soundia\\spotify_log.txt', "\n\nSEARCH STATUS: " + sRes.statusCode + "\nBODY: " + sBody);
        });
      });
      sReq.on('error', e => fs.appendFileSync('D:\\WORKSPACE\\soundia\\spotify_log.txt', '\nSEARCH REQ ERR: ' + e.message));
      sReq.end();
    } catch(e) {
      fs.appendFileSync('D:\\WORKSPACE\\soundia\\spotify_log.txt', "\nPARSE ERROR: " + e.message);
    }
  });
});
req.on('error', e => fs.writeFileSync('D:\\WORKSPACE\\soundia\\spotify_log.txt', 'AUTH REQ ERR: ' + e.message));
req.write('grant_type=client_credentials');
req.end();
