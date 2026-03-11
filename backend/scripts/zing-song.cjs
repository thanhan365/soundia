// Helper script to fetch Zing MP3 single song data
// Uses the zingmp3-api-full npm package
// Called from C# backend: node zing-song.cjs <songId>

const { ZingMp3 } = require('zingmp3-api-full');

const songId = process.argv[2];
if (!songId) {
    console.log(JSON.stringify({ error: 'No song ID provided' }));
    process.exit(1);
}

ZingMp3.getSong(songId)
    .then(async (result) => {
        // Also get song info for metadata
        const infoResult = await ZingMp3.getInfoSong(songId);
        const info = infoResult.data || {};

        console.log(JSON.stringify({
            id: `zing_${info.encodeId || songId}`,
            title: info.title || '',
            artist: info.artistsNames || 'Unknown',
            cover: info.thumbnailM || info.thumbnail || '',
            duration: info.duration || 0
        }));
    })
    .catch(err => {
        console.log(JSON.stringify({ error: err.message || 'Unknown error' }));
        process.exit(1);
    });
