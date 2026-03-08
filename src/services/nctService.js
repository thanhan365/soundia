import api from '../utils/api';

export const searchNCT = async (query) => {
  if (!query) return { tracks: [], artists: [], playlists: [] };
  try {
    const response = await api.get(`/songs/nct-search?query=${encodeURIComponent(query)}`);
    const data = response.data;
    
    // Parse response according to nhaccuatui-api-full format
    const parsed = {
      tracks: [],
      artists: [],
      playlists: []
    };

    if (data && data.search && data.search.song) {
        parsed.tracks = data.search.song.song.map(s => ({
            id: s.key,
            title: s.title,
            artist: s.artists.map(a => a.name).join(', '),
            cover: s.thumbnail || s.thumbnail_medium,
            preview: '', // We get standard URL later on play
            source: 'nct',
            artistId: s.artists[0]?.shortLink
        }));
    }

    if (data && data.search && data.search.artist) {
        parsed.artists = data.search.artist.artist.map(a => ({
            id: a.shortLink,
            name: a.name,
            image: a.imageUrl
        }));
    }

    if (data && data.search && data.search.playlist) {
        parsed.playlists = data.search.playlist.playlist.map(p => ({
            id: p.key,
            title: p.title,
            cover: p.thumbnail,
            creator: p.artists.map(a => a.name).join(', ')
        }));
    }

    return parsed;
  } catch (error) {
    console.error("NCT search error:", error);
    return { tracks: [], artists: [], playlists: [] };
  }
};

export const getNctHome = async () => {
  try {
    const response = await api.get('/songs/nct-home');
    return response.data;
  } catch (error) {
    console.error("NCT getHome error:", error);
    return null;
  }
};

export const getNctSong = async (id) => {
  try {
    const response = await api.get(`/songs/nct-song/${id}`);
    return response.data;
  } catch (error) {
    console.error("NCT getSong error:", error);
    return null;
  }
};

export const getNctPlaylist = async (id) => {
  try {
    const response = await api.get(`/songs/nct-playlist/${id}`);
    return response.data;
  } catch (error) {
    console.error("NCT getPlaylist error:", error);
    return null;
  }
};

export const getNctArtist = async (id) => {
  try {
    const response = await api.get(`/songs/nct-artist/${id}`);
    return response.data;
  } catch (error) {
    console.error("NCT getArtist error:", error);
    return null;
  }
};

export const getNctTrendingArtists = async () => {
    try {
      const response = await api.get(`/songs/nct-trending-artists`);
      return response.data;
    } catch (error) {
      console.error("NCT getTrendingArtists error:", error);
      return null;
    }
  };
