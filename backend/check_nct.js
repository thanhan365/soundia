const https = require('https');

console.log("Starting NCT test...");

const req1 = https.get('https://graph.nhaccuatui.com/v2/commons/searchBy?q=den&type=song', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("--- GRAPH V2 ---", data.substring(0, 1000)));
});
req1.on('error', e => console.error("GRAPH Error:", e.message));
req1.setTimeout(3000, () => { req1.abort(); console.log("GRAPH Timeout"); });

const req2 = https.get({
    hostname: 'www.nhaccuatui.com',
    path: '/ajax/search?q=den&b=song',
    headers: { 'User-Agent': 'Mozilla/5.0' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log("--- AJAX WEB ---", data.substring(0, 1000)));
});
req2.on('error', e => console.error("AJAX Error:", e.message));
req2.setTimeout(3000, () => { req2.abort(); console.log("AJAX Timeout"); });
