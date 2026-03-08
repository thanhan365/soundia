const fs = require('fs');
const https = require('https');

async function testSpotify() {
    return new Promise((resolve) => {
        const req = https.request({
            hostname: 'accounts.spotify.com',
            path: '/api/token',
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + Buffer.from('9126d12ad200472a9b4bd0c887b74a2d:535f4e2472894f06a371e568a69dec04').toString('base64'),
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }, res => {
            let b = '';
            res.on('data', d => b += d);
            res.on('end', () => {
                const token = JSON.parse(b).access_token;
                if(!token) return resolve("NO TOKEN " + b);
                
                const sReq = https.request({
                    hostname: 'api.spotify.com',
                    path: '/v1/search?q=den&type=artist&market=VN&limit=5',
                    method: 'GET',
                    headers: {'Authorization': 'Bearer ' + token}
                }, sRes => {
                    let sb = '';
                    sRes.on('data', d => sb += d);
                    sRes.on('end', () => resolve("STATUS " + sRes.statusCode + " " + sb));
                });
                sReq.end();
            });
        });
        req.write('grant_type=client_credentials');
        req.end();
    });
}

testSpotify().then(res => {
    fs.writeFileSync('D:\\WORKSPACE\\soundia\\FINAL_TEST.txt', res, {encoding: 'utf8', flag: 'w'});
    process.exit(0);
});
