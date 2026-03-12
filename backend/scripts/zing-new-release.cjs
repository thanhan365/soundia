// Helper script to fetch Zing MP3 new release songs
// Uses the zingmp3-api-full npm package
// Called from C# backend: node zing-new-release.cjs

const { ZingMp3 } = require('zingmp3-api-full');

ZingMp3.getNewReleaseChart()
    .then(result => {
        if (result.err !== 0) {
            console.log(JSON.stringify({ error: result.msg || 'API error' }));
            process.exit(1);
        }

        const data = result.data;
        // items is an object with numeric keys (0, 1, 2, ...), convert to array
        const rawItems = data?.items || {};
        const items = Array.isArray(rawItems) ? rawItems : Object.values(rawItems);

        const songs = items.map((item, idx) => ({
            id: `zing_${item.encodeId || idx}`,
            title: item.title || '',
            artist: item.artistsNames || 'Unknown',
            cover: item.thumbnailM || item.thumbnail || '',
            duration: item.duration || 0,
            releaseDate: item.releaseDate || 0,
        }));

        console.log(JSON.stringify({
            total: songs.length,
            songs: songs,
        }));
    })
    .catch(err => {
        console.log(JSON.stringify({ error: err.message || 'Unknown error' }));
        process.exit(1);
    });
