const https = require('https');

const clientId = '9126d12ad200472a9b4bd0c887b74a2d';
const clientSecret = '535f4e2472894f06a371e568a69dec04';
const auth = Buffer.from(clientId + ':' + clientSecret).toString('base64');

const authOptions = {
    hostname: 'accounts.spotify.com',
    path: '/api/token',
    method: 'POST',
    headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
    }
};

const req = https.request(authOptions, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        try {
            const token = JSON.parse(body).access_token;
            if (!token) {
                console.error("NO TOKEN GIVEN:", body);
                process.exit(1);
            }
            
            const searchOpts = {
                hostname: 'api.spotify.com',
                path: '/v1/search?q=den&type=artist&market=VN&limit=5',
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            };
            
            const sReq = https.request(searchOpts, sRes => {
                let sBody = '';
                sRes.on('data', d => sBody += d);
                sRes.on('end', () => {
                    console.log(`__SPOTIFY_SEARCH_STATUS_${sRes.statusCode}__`);
                    console.log(`__SPOTIFY_SEARCH_BODY_${sBody}__`);
                });
            });
            sReq.end();
            
        } catch(e) {
            console.error("PARSE ERROR:", e);
        }
    });
});
req.write('grant_type=client_credentials');
req.end();
