// Helper script to fetch Zing MP3 playlist data
// Uses the zingmp3-api-full npm package
// Called from C# backend: node zing-playlist.js <playlistId>

const { ZingMp3 } = require('zingmp3-api-full');

const playlistId = process.argv[2];
if (!playlistId) {
    console.log(JSON.stringify({ error: 'No playlist ID provided' }));
    process.exit(1);
}

ZingMp3.getDetailPlaylist(playlistId)
    .then(result => {
        if (result.err !== 0) {
            console.log(JSON.stringify({ error: result.msg || 'API error' }));
            process.exit(1);
        }

        const data = result.data;
        const songs = (data.song?.items || []).map((item, idx) => ({
            id: `zing_${item.encodeId || idx}`,
            title: item.title || '',
            artist: item.artistsNames || 'Unknown',
            cover: item.thumbnailM || item.thumbnail || '',
            duration: item.duration || 0
        }));

        console.log(JSON.stringify({
            name: data.title || '',
            image: data.thumbnailM || data.thumbnail || '',
            totalSongs: songs.length,
            tracks: songs
        }));
    })
    .catch(err => {
        console.log(JSON.stringify({ error: err.message || 'Unknown error' }));
        process.exit(1);
    });
