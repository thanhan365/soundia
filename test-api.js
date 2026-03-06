const http = require('http');

http.get('http://localhost:5066/api/songs/deezer-proxy?query=sontung', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Deezer results count:', json.data ? json.data.length : 'NO DATA ARRAY');
    } catch(e) {
      console.log('Deezer Error parsing JSON:', e.message, data.substring(0, 100));
    }
  });
}).on('error', console.error);

http.get('http://localhost:5066/api/stream?query=sontung', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('Stream result:', json);
    } catch(e) {
      console.log('Stream Error parsing JSON:', e.message, data.substring(0, 100));
    }
  });
}).on('error', console.error);
