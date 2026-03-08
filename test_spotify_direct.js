const fs = require('fs');

const CLIENT_ID = '9126d12ad200472a9b4bd0c887b74a2d';
const CLIENT_SECRET = '535f4e2472894f06a371e568a69dec04';

async function test() {
  try {
    // Step 1: Get access token
    const authString = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');
    const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenText = await tokenRes.text();
    fs.writeFileSync('spotify_token_response.txt', `Status: ${tokenRes.status}\n${tokenText}`);

    if (!tokenRes.ok) {
      fs.appendFileSync('spotify_token_response.txt', '\n\nFAILED TO GET TOKEN');
      return;
    }

    const tokenData = JSON.parse(tokenText);
    const accessToken = tokenData.access_token;

    // Step 2: Search
    const searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent('sơn tùng')}&type=track,artist&limit=5`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    const searchText = await searchRes.text();
    fs.writeFileSync('spotify_search_response.txt', `Status: ${searchRes.status}\n${searchText.substring(0, 2000)}`);
  } catch (err) {
    fs.writeFileSync('spotify_error.txt', err.message + '\n' + err.stack);
  }
}

test();
