const https = require('https');
const data = new URLSearchParams({'grant_type': 'client_credentials'});

const req = https.request('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
        'Authorization': 'Basic ' + Buffer.from('9126d12ad200472a9b4bd0c887b74a2d:535f4e2472894f06a371e568a69dec04').toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
    }
}, (res) => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
        console.log("Auth Response:", body);
        const json = JSON.parse(body);
        if (!json.access_token) return;
        
        const token = json.access_token;
        console.log("Got token. Fetching search...");
        
        https.get('https://api.spotify.com/v1/search?q=den+vau&type=artist,track', {
            headers: {'Authorization': 'Bearer ' + token}
        }, (sr) => {
            let sbody = '';
            sr.on('data', d => sbody += d);
            sr.on('end', () => {
                console.log("Search Result Status:", sr.statusCode);
                console.log("Data snippet:", sbody.substring(0, 300));
            });
        });
    });
});
req.write(data.toString());
req.end();
