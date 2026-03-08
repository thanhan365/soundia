const https = require('https');

https.get({
    hostname: 'www.nhaccuatui.com',
    path: '/tim-kiem/bai-hat?q=den',
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
     let match = data.match(/window\.NCTGraphSettings\s*=\s*(.*?);/);
     if (match) console.log("FOUND NCTGraphSettings length:", match[1].length);
     
     let match2 = data.match(/window\.NCTSearchState\s*=\s*(.*?);/);
     if (match2) {
         console.log("FOUND NCTSearchState!");
         console.log(match2[1].substring(0, 1000));
     } else {
         console.log("NO SEARCH STATE FOUND! HTML Length:", data.length);
     }
  });
});
