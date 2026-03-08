fetch('http://localhost:5066/api/songs/spotify-proxy?query=top%20hits&type=track,artist')
  .then(res => res.text())
  .then(text => require('fs').writeFileSync('response_500.txt', text))
  .catch(err => require('fs').writeFileSync('response_500.txt', err.message));
