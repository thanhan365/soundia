const express = require('express');
const cors = require('cors');
const NCT = require('nhaccuatui-api-full');

const app = express();
const port = 5001;

// CORS configuration to allow requests from the React frontend
app.use(cors({ origin: '*' }));
app.use(express.json());

// Add a simple health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'nct-proxy' });
});

// Search route
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter q' });
    }
    const data = await NCT.searchByKeyword(query);
    res.json(data);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search NCT' });
  }
});

// Get song detail route
app.get('/api/song/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = await NCT.getSong(id);
    res.json(data);
  } catch (error) {
    console.error('Song detail error:', error);
    res.status(500).json({ error: 'Failed to get song detail' });
  }
});

// Get playlist detail route
app.get('/api/playlist/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const data = await NCT.getPlaylistDetail(id);
    res.json(data);
  } catch (error) {
    console.error('Playlist detail error:', error);
    res.status(500).json({ error: 'Failed to get playlist detail' });
  }
});

// Get Home data route (Trending, Playlists, etc.)
app.get('/api/home', async (req, res) => {
  try {
    const data = await NCT.getHome();
    res.json(data);
  } catch (error) {
    console.error('Home data error:', error);
    res.status(500).json({ error: 'Failed to get home data' });
  }
});

// Get Top 100
app.get('/api/top100', async (req, res) => {
  try {
    const data = await NCT.getTop100();
    res.json(data);
  } catch (error) {
    console.error('Top 100 data error:', error);
    res.status(500).json({ error: 'Failed to get Top 100 data' });
  }
});

app.listen(port, () => {
  console.log(`NhacCuaTui Proxy Server running at http://localhost:${port}`);
});
