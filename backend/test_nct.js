const https = require('https');

https.get('https://www.nhaccuatui.com/bai-hat/top-20.html', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const keys = [...data.matchAll(/\.([a-zA-Z0-9]{12})\.html/g)].map(m => m[1]);
    const key = keys[0];
    console.log("Found key:", key);
    
    // API 1: graph API
    https.get('https://graph.nhaccuatui.com/v1/commons/song?key=' + key, (r2) => {
        let d2 = ''; r2.on('data', c => d2 += c);
        r2.on('end', () => console.log("Graph:", d2));
    });

    // API 2: XML API
    https.get('https://www.nhaccuatui.com/flash/xml?key1=' + key, (r3) => {
        let d3 = ''; r3.on('data', c => d3+=c);
        r3.on('end', () => console.log("XML:", d3));
    });
  });
});
