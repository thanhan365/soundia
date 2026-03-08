import api from '../utils/api';

export const searchDeezer = async (query) => {
  if (!query) return [];
  try {
    // Gọi thông qua Backend để tránh CORS và tăng độ ổn định
    const response = await api.get(`/songs/deezer-proxy?query=${encodeURIComponent(query)}`);
    const data = response.data;
    
    return data.data.map(song => ({
      id: `dz_${song.id}`, // Đánh dấu đây là nhạc từ Deezer
      deezerId: song.id,
      title: song.title,
      artist: song.artist.name,
      duration: formatDuration(song.duration),
      cover: song.album.cover_medium,
      audio: song.preview || "", // Deezer cung cấp sẵn link preview MP3 30s
      isExternal: true // Đánh dấu bài hát này chưa có trong DB
    }));
  } catch (error) {
    console.error("Deezer Search Error:", error);
    return [];
  }
};

export const searchDeezerGlobal = async (query) => {
  if (!query) return { tracks: [], artists: [], playlists: [] };
  try {
    const safeQ = encodeURIComponent(query);
    const [tracksRes, artistsRes, playlistsRes] = await Promise.all([
      fetchDeezerJSONP(`https://api.deezer.com/search/track?q=${safeQ}&limit=10`),
      fetchDeezerJSONP(`https://api.deezer.com/search/artist?q=${safeQ}&limit=5`),
      fetchDeezerJSONP(`https://api.deezer.com/search/playlist?q=${safeQ}&limit=5`)
    ]);

    const tracks = (tracksRes?.data || []).map(song => ({
      id: `dz_${song.id}`,
      deezerId: song.id,
      title: song.title,
      artist: song.artist.name,
      duration: formatDuration(song.duration),
      cover: song.album.cover_medium,
      audio: song.preview || "",
      isExternal: true,
      source: "deezer"
    }));

    const artists = (artistsRes?.data || []).map(artist => ({
      id: artist.id,
      name: artist.name,
      picture: artist.picture_medium || artist.picture,
      source: "deezer"
    }));

    const playlists = (playlistsRes?.data || []).map(playlist => ({
      id: playlist.id,
      title: playlist.title,
      cover: playlist.picture_medium || playlist.picture,
      user: playlist.user?.name || "Deezer",
      source: "deezer"
    }));

    return { tracks, artists, playlists };
  } catch (error) {
    console.error("Deezer Global Search Error:", error);
    return { tracks: [], artists: [], playlists: [] };
  }
};

export const getDeezerTrackByIsrc = async (isrc) => {
  if (!isrc) return null;
  try {
    const response = await api.get(`/songs/deezer-isrc/${isrc}`);
    return response.data;
  } catch (error) {
    console.error("Deezer ISRC lookup error:", error);
    return null;
  }
};

// Sử dụng JSONP để bypass CORS trực tiếp từ frontend cho các endpoint Public (như Chart)
const fetchDeezerJSONP = (url) => {
  return new Promise((resolve, reject) => {
    const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
    window[callbackName] = function(data) {
      delete window[callbackName];
      document.body.removeChild(script);
      resolve(data);
    };
    
    const script = document.createElement('script');
    // Nối thêm param callback và output=jsonp
    const delimiter = url.includes('?') ? '&' : '?';
    script.src = `${url}${delimiter}output=jsonp&callback=${callbackName}`;
    script.onerror = () => {
      delete window[callbackName];
      document.body.removeChild(script);
      reject(new Error("JSONP Request Failed"));
    };
    document.body.appendChild(script);
  });
};

export const getDeezerTrending = async (limit = 20) => {
  try {
    const data = await fetchDeezerJSONP(`https://api.deezer.com/chart/0/tracks?limit=${limit}`);
    if (!data || !data.data) return [];
    
    return data.data.map(song => ({
      id: `dz_${song.id}`,
      deezerId: song.id,
      title: song.title,
      artist: song.artist.name,
      duration: formatDuration(song.duration),
      cover: song.album.cover_medium,
      audio: song.preview || "",
      isExternal: true
    }));
  } catch (error) {
    console.error("Deezer Trending Error:", error);
    return [];
  }
};

export const getDeezerPlaylists = async (limit = 15) => {
  try {
    const data = await fetchDeezerJSONP(`https://api.deezer.com/chart/0/playlists?limit=${limit}`);
    if (!data || !data.data) return [];
    
    return data.data.map(pl => ({
      id: pl.id,
      title: pl.title,
      cover: pl.picture_medium || pl.picture,
      type: 'playlist',
      user: pl.user ? pl.user.name : "Deezer"
    }));
  } catch (error) {
    console.error("Deezer Playlists Error:", error);
    return [];
  }
};

export const getDeezerTopArtists = async (limit = 10) => {
  try {
    const data = await fetchDeezerJSONP(`https://api.deezer.com/chart/0/artists?limit=${limit}`);
    if (!data || !data.data) return [];
    
    return data.data.map(artist => ({
      id: artist.id,
      name: artist.name,
      picture: artist.picture_medium || artist.picture,
    }));
  } catch (error) {
    console.error("Deezer Artists Error:", error);
    return [];
  }
};

export const getDeezerArtistDetails = async (id) => {
  try {
    const data = await fetchDeezerJSONP(`https://api.deezer.com/artist/${id}`);
    if (!data || data.error) return null;
    return {
      id: data.id,
      name: data.name,
      picture: data.picture_xl || data.picture_large || data.picture_medium,
      fans: data.nb_fan,
    };
  } catch (error) {
    console.error("Deezer Artist Details Error:", error);
    return null;
  }
};

export const getDeezerArtistTopTracks = async (id, limit = 20) => {
  try {
    const data = await fetchDeezerJSONP(`https://api.deezer.com/artist/${id}/top?limit=${limit}`);
    if (!data || !data.data) return [];
    return data.data.map(song => ({
      id: `dz_${song.id}`,
      title: song.title,
      artist: song.artist.name,
      duration: formatDuration(song.duration),
      cover: song.album.cover_medium,
      audio: song.preview || "",
      isExternal: true
    }));
  } catch (error) {
    console.error("Deezer Artist Top Tracks Error:", error);
    return [];
  }
};

export const getDeezerPlaylistTracks = async (id) => {
  try {
    const data = await fetchDeezerJSONP(`https://api.deezer.com/playlist/${id}`);
    if (!data || data.error) return null;
    const tracks = data.tracks.data.map(song => ({
      id: `dz_${song.id}`,
      title: song.title,
      artist: song.artist.name,
      duration: formatDuration(song.duration),
      cover: song.album.cover_medium,
      audio: song.preview || "",
      isExternal: true
    }));
    return {
      id: data.id,
      title: data.title,
      description: data.description,
      picture: data.picture_xl || data.picture_large || data.picture_medium,
      creator: data.creator.name,
      fans: data.fans,
      tracks: tracks
    };
  } catch (error) {
    console.error("Deezer Playlist Tracks Error:", error);
    return null;
  }
};

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
