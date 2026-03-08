const http = require('http');
const fs = require('fs');

http.get('http://localhost:5066/api/songs/spotify-artist-search?query=den', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        fs.writeFileSync('D:\\WORKSPACE\\soundia\\fetch_result.txt', `STATUS: ${res.statusCode}\nBODY: ${data}`);
    });
}).on('error', err => {
    fs.writeFileSync('D:\\WORKSPACE\\soundia\\fetch_result.txt', `ERROR: ${err.message}`);
});
