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

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
