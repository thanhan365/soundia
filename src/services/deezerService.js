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

const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
