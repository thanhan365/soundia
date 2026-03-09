const axios = require('axios');

async function run() {
    // NCT chart API works! Test different chart keys
    const chartKeys = [
        '1-5-d64-2026',    // Top trending (đã hoạt động)
        '1-5-d65-2026',    // Other chart?
        '1-10-d64-2026',   // V-Pop?
        '1-11-d64-2026',   // US-UK?
        '1-12-d64-2026',   // K-Pop?
        '1-13-d64-2026',   // Hoa?
        '1-5-d63-2026',    // Previous?
        '2-5-d64-2026',    // Different category?
    ];

    for (const key of chartKeys) {
        try {
            const url = `https://graph.nhaccuatui.com/api/v1/playlist/charts/${key}?key=${key}&isShowLoading=false`;
            const res = await axios.get(url, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                timeout: 5000
            });
            const name = res.data?.data?.name || 'N/A';
            const items = res.data?.data?.items?.length || 0;
            console.log(`key=${key} => name="${name}" items=${items}`);
        } catch (e) {
            console.log(`key=${key} => Error: ${e.response?.status || e.message}`);
        }
    }

    // Also try non-chart playlist endpoints
    console.log('\n--- Try playlist detail endpoints ---');
    const testKeys = ['1-5-d64-2026', 'playlist1'];
    for (const key of testKeys) {
        const urls = [
            `https://graph.nhaccuatui.com/api/v1/playlist?key=${key}&size=50`,
            `https://graph.nhaccuatui.com/api/v1/playlist/info?key=${key}`,
        ];
        for (const url of urls) {
            try {
                const res = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
                console.log(`${url.split('.com')[1]} => code:${res.data?.code} items:${res.data?.data?.items?.length || 0}`);
                if (res.data?.data) {
                    const d = JSON.stringify(res.data.data);
                    console.log('  data:', d.substring(0, 300));
                }
            } catch (e) {
                console.log(`${url.split('.com')[1]} => ${e.response?.status || e.message}`);
            }
        }
    }
}

run().catch(e => console.log('Fatal:', e.message));
