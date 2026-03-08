const http = require('http');

console.log("Testing API...");

http.get('http://localhost:5066/api/songs/spotify-artist-search?query=den%20vau', res => {
   let body = '';
   res.on('data', d => body += d);
   res.on('end', () => console.log('artist-search status:', res.statusCode, 'body:', body.substring(0, 500)));
}).on('error', e => console.error("artist-search error:", e.message));

http.get('http://localhost:5066/api/songs/spotify-proxy?query=den%20vau', res => {
   let body = '';
   res.on('data', d => body += d);
   res.on('end', () => console.log('proxy status:', res.statusCode, 'body:', body.substring(0, 500)));
}).on('error', e => console.error("proxy error:", e.message));
