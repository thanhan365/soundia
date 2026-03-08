const https = require('https');

const url = 'https://www.nhaccuatui.com/ajax/search?q=mono&b=song';

https.get(url, (res) => {
    let data = '';
    
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log(data.substring(0, 1000));
    });
}).on('error', (err) => {
    console.error('Error:', err.message);
});
