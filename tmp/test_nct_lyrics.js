const axios = require('axios');

async function run() {
    // 1. Check if streamURL is in chart or song detail  
    console.log('=== Checking streamURL in detail ===\n');

    // Get chart songs
    const chartKey = '1-5-d68-2026';  // latest chart from API
    const chart = await axios.get(`https://graph.nhaccuatui.com/api/v1/playlist/charts/${chartKey}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const s = chart.data.data.items[0];
    console.log(`Song: ${s.name} - ${s.artistName}`);
    console.log(`streamURL: "${s.streamURL}"`);
    console.log(`statusPlay: ${s.statusPlay}`);
    console.log(`qualityDownload: ${JSON.stringify(s.qualityDownload)}`);

    // Get song detail too
    const detail = await axios.get(`https://graph.nhaccuatui.com/api/v1/song/detail/${s.key}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const d = detail.data.data;
    console.log(`\nDetail streamURL: "${d.streamURL}"`);
    console.log(`Detail qualityDownload: ${JSON.stringify(d.qualityDownload)}`);

    // 2. Get search result with streamURL  
    console.log('\n\n=== Checking streamURL in Search Results ===\n');
    const searchRes = await axios.get('https://graph.nhaccuatui.com/api/v1/search/song?keyword=son+tung&pageindex=1&pagesize=3&correct=false', {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const searchSong = searchRes.data.data.songs[0];
    console.log(`Search song: ${searchSong.name} - ${searchSong.artistName}`);
    console.log(`streamURL: "${searchSong.streamURL || 'N/A'}"`);
    console.log(`All keys: ${Object.keys(searchSong).join(', ')}`);
    console.log(`Full: ${JSON.stringify(searchSong).substring(0, 800)}`);

    // 3. Try to get stream URL via song key (maybe endpoint for streaming)  
    console.log('\n\n=== Testing Stream Endpoints ===\n');
    const key = searchSong.key;
    const streamTests = [
        `https://graph.nhaccuatui.com/api/v1/song/stream/${key}`,
        `https://graph.nhaccuatui.com/api/v1/media/stream/${key}`,
        `https://graph.nhaccuatui.com/api/v1/song/play/${key}`,
        `https://graph.nhaccuatui.com/api/v1/song/url/${key}`,
    ];

    for (const url of streamTests) {
        try {
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            });
            console.log(`✅ ${url.split('.com')[1]}`);
            console.log(`   ${JSON.stringify(res.data).substring(0, 500)}`);
        } catch (e) {
            if (e.response?.status !== 404) {
                console.log(`⚠️ ${url.split('.com')[1]} => ${e.response?.status || e.message}`);
                if (e.response?.data) console.log(`   ${JSON.stringify(e.response.data).substring(0, 200)}`);
            }
        }
    }

    // 4. Try the Nuxt page approach - when NCT renders a song page server-side, the __NUXT_DATA__ might have streamURL
    console.log('\n\n=== Checking Song Page SSR Data ===\n');
    const linkShare = d.linkShare || `https://www.nhaccuatui.com/bai-hat/${searchSong.name.toLowerCase().replace(/\s/g, '-')}.${searchSong.key}.html`;
    console.log('Fetching:', linkShare);

    try {
        const page = await axios.get(linkShare, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 10000
        });

        // Look in page for stream URLs - could be in meta tags, JSON-LD, or Nuxt data
        const ogAudio = page.data.match(/<meta[^>]*property="og:audio"[^>]*content="([^"]+)"/);
        const ogUrl = page.data.match(/<meta[^>]*property="og:url"[^>]*content="([^"]+)"/);
        if (ogAudio) console.log('og:audio:', ogAudio[1]);
        if (ogUrl) console.log('og:url:', ogUrl[1]);

        // Find Nuxt data
        const nuxtMatch = page.data.match(/<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
        if (nuxtMatch) {
            const arr = JSON.parse(nuxtMatch[1]);
            console.log('Nuxt data elements:', arr.length);

            // Find ALL strings including stream URLs
            for (let i = 0; i < arr.length; i++) {
                if (typeof arr[i] === 'string') {
                    const v = arr[i];
                    if (v.includes('.m4a') || v.includes('.mp3') || v.includes('stream') || v.includes('cdn.nct') || v.includes('audio-cdn') || v.includes('nixcdn') || v.includes('mp3.zing')) {
                        console.log(`  [${i}] ${v}`);
                    }
                }
            }
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

run().catch(e => console.log('Fatal:', e.message));
