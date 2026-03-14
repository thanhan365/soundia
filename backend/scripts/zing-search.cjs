// Helper script to search Zing MP3
// Called from C# backend: node zing-search.cjs <query> [limit]

const { ZingMp3 } = require('zingmp3-api-full-v2');

const query = process.argv[2];
const limit = parseInt(process.argv[3]) || 10;

if (!query) {
    console.log(JSON.stringify({ error: 'No query provided' }));
    process.exit(1);
}

ZingMp3.search(query)
    .then(result => {
        const data = result.data || {};
        const songs = (data.songs || []).slice(0, limit).map(s => ({
            id: `zing_${s.encodeId}`,
            title: s.title || '',
            artist: s.artistsNames || 'Unknown',
            cover: s.thumbnailM || s.thumbnail || '',
            duration: s.duration || 0,
            source: 'zing'
        }));
        console.log(JSON.stringify({ songs }));
    })
    .catch(err => {
        console.log(JSON.stringify({ error: err.message || 'Unknown error', songs: [] }));
        process.exit(1);
    });
