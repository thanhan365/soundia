import api from '../utils/api';

const formatDuration = (ms) => {
  if (typeof ms === 'string' && ms.includes(':')) return ms;
  const totalSeconds = Math.floor((ms || 0) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const fallbackJsonpScript = (url, timeoutMs = 3000) => {
    return new Promise((resolve, reject) => {
      const callbackName = 'jsonp_callback_' + Math.round(100000 * Math.random());
      let timedOut = false;
      
      const timer = setTimeout(() => {
        timedOut = true;
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("JSONP timeout after " + timeoutMs + "ms"));
      }, timeoutMs);

      window[callbackName] = function(data) {
        if (timedOut) return;
        clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        resolve(data);
      };
      
      const script = document.createElement('script');
      script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
      script.onerror = function() {
        if (timedOut) return;
        clearTimeout(timer);
        delete window[callbackName];
        if (script.parentNode) script.parentNode.removeChild(script);
        reject(new Error("JSONP script loading failed"));
      };
      document.body.appendChild(script);
    });
};

// Parse NCT songs từ bất kỳ payload nào
const parseNctSongs = (payload) => {
    let sourceSongs = [];
    if (payload?.data?.song && Array.isArray(payload.data.song)) {
        sourceSongs = payload.data.song;
    } else if (payload?.song?.song && Array.isArray(payload.song.song)) {
        sourceSongs = payload.song.song;
    } else if (payload?.data?.songs && Array.isArray(payload.data.songs)) {
        sourceSongs = payload.data.songs;
    } else if (payload?.data && Array.isArray(payload.data)) {
        sourceSongs = payload.data;
    }
    return sourceSongs;
};

// Map NCT song object sang format chuẩn
const mapNctSong = (s) => {
    // NCT có thể dùng `singer` (string) hoặc `artists` (array of {name})
    let artistName = 'Unknown Artist';
    if (typeof s.singer === 'string' && s.singer) {
        artistName = s.singer;
    } else if (s.artists && Array.isArray(s.artists) && s.artists.length > 0) {
        artistName = s.artists.map(a => a.name || a).join(', ');
    } else if (s.artistName) {
        artistName = s.artistName;
    }
    
    return {
        id: `nct_${s.key || s.songKey || s.id || Math.random().toString(36).substr(2)}`,
        title: s.title || s.name || 'Unknown',
        artist: artistName,
        duration: formatDuration(s.duration || 0),
        cover: s.thumbnail || s.thumbnail_medium || s.bigavatar || s.avatar || s.image || '',
        audio: 'YT_STREAM',
        source: 'nct'
    };
};

export const searchNCT = async (query) => {
  if (!query) return { tracks: [], artists: [], playlists: [] };
  try {
    // Phương án 1: JSONP trực tiếp (nhanh nhất, không cần backend)
    const nctAjaxUrl = `https://www.nhaccuatui.com/ajax/search?q=${encodeURIComponent(query)}&b=song&s=default`;
    let payload;
    
    try {
      payload = await fallbackJsonpScript(nctAjaxUrl, 4000);
      console.log('[NCT JSONP] success, payload keys:', Object.keys(payload || {}));
    } catch (jsonpErr) {
      console.warn('[NCT JSONP] failed, trying backend proxy...', jsonpErr.message);
      // Phương án 2: Fallback qua backend proxy
      try {
        const proxyResp = await api.get(`/songs/nct-proxy?query=${encodeURIComponent(query)}`);
        payload = proxyResp.data;
        console.log('[NCT Proxy] success, payload keys:', Object.keys(payload || {}));
      } catch (proxyErr) {
        console.warn('[NCT Proxy] also failed:', proxyErr.message);
        return { tracks: [], artists: [], playlists: [] };
      }
    }
    
    const sourceSongs = parseNctSongs(payload);
    console.log(`[NCT] Found ${sourceSongs.length} songs for query: "${query}"`);
    
    const tracks = sourceSongs.map(mapNctSong);
    
    return { tracks, artists: [], playlists: [] };
  } catch (error) {
    console.error("[NCT search error]:", error);
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
