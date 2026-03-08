const axios = require('axios');

async function testSpotify() {
    const clientId = '9126d12ad200472a9b4bd0c887b74a2d';
    const clientSecret = '535f4e2472894f06a371e568a69dec04';

    try {
        console.log('Getting token...');
        const tokenResponse = await axios.post('https://accounts.spotify.com/api/token', 
            'grant_type=client_credentials',
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64')
                }
            }
        );
        const token = tokenResponse.data.access_token;
        console.log('Token received:', token.substring(0, 10) + '...');

        console.log('\nTesting Search API with market=VN...');
        try {
            const res1 = await axios.get('https://api.spotify.com/v1/search?q=den+vau&type=artist&market=VN&limit=5', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            console.log('Search success!', res1.data.artists.items.length, 'artists found');
        } catch (e) {
            console.log('Search failed:', e.response?.status, e.response?.data);
        }

        console.log('\nTesting Search API WITHOUT market=VN...');
        try {
            const res2 = await axios.get('https://api.spotify.com/v1/search?q=den+vau&type=artist&limit=5', {
                headers: { 'Authorization': 'Bearer ' + token }
            });
            console.log('Search without market success!', res2.data.artists.items.length, 'artists found');
        } catch (e) {
            console.log('Search without market failed:', e.response?.status, e.response?.data);
        }

    } catch (error) {
        console.error('Fatal error:', error.response?.status, error.response?.data || error.message);
    }
}

testSpotify();
