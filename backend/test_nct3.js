const https = require('https');

https.get('https://graph.nhaccuatui.com/v1/commons/song?key=bA2k7X9d9sEw', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log(JSON.stringify(json, null, 2));
    } catch (e) {}
  });
}).on('error', console.error);
