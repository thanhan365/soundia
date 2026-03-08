import api from "../utils/api";

const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

// Lấy artwork chất lượng cao (thay 100x100 thành 600x600)
const getHighResArtwork = (url) => {
  if (!url) return "";
  return url.replace("100x100bb", "600x600bb");
};

/**
 * Tìm kiếm bài hát qua iTunes Search API (proxy qua backend)
 */
export const searchItunes = async (query) => {
  if (!query) return { tracks: [], artists: [] };
  try {
    const response = await api.get(`/songs/itunes-proxy?term=${encodeURIComponent(query)}&media=music&limit=15&country=VN`);
    const data = response.data;

    if (!data?.results) return { tracks: [], artists: [] };

    // Parse tracks
    const tracks = data.results
      .filter(item => item.wrapperType === "track" && item.kind === "song")
      .map(track => ({
        id: `itunes_${track.trackId}`,
        title: track.trackName,
        artist: track.artistName || "Unknown Artist",
        duration: formatDuration(track.trackTimeMillis || 0),
        cover: getHighResArtwork(track.artworkUrl100),
        audio: track.previewUrl || "YT_STREAM",
        isExternal: true,
        source: "itunes",
        genre: track.primaryGenreName || "",
        album: track.collectionName || "",
      }));

    // Trích xuất danh sách nghệ sĩ duy nhất từ kết quả
    const artistMap = new Map();
    data.results.forEach(item => {
      if (item.artistId && !artistMap.has(item.artistId)) {
        artistMap.set(item.artistId, {
          id: `itunes_artist_${item.artistId}`,
          name: item.artistName,
          picture: getHighResArtwork(item.artworkUrl100),
          source: "itunes"
        });
      }
    });
    const artists = Array.from(artistMap.values());

    return { tracks, artists, playlists: [] };
  } catch (error) {
    console.error("iTunes search error:", error);
    return { tracks: [], artists: [], playlists: [] };
  }
};

/**
 * Tìm kiếm nghệ sĩ qua iTunes
 */
export const searchItunesArtist = async (query) => {
  if (!query) return null;
  try {
    const response = await api.get(`/songs/itunes-proxy?term=${encodeURIComponent(query)}&media=music&entity=musicArtist&limit=5&country=VN`);
    const data = response.data;
    if (data?.results?.length > 0) {
      const artist = data.results[0];
      return {
        id: artist.artistId,
        name: artist.artistName,
        genre: artist.primaryGenreName || "",
        source: "itunes"
      };
    }
    return null;
  } catch (error) {
    console.error("iTunes artist search error:", error);
    return null;
  }
};

/**
 * Lấy top tracks của nghệ sĩ qua iTunes lookup
 */
export const getItunesArtistTopTracks = async (artistId) => {
  if (!artistId) return [];
  try {
    // Dùng iTunes Lookup API để lấy bài hát của nghệ sĩ
    const response = await api.get(`/songs/itunes-lookup?id=${artistId}&entity=song&limit=20&country=VN`);
    const data = response.data;
    if (data?.results) {
      return data.results
        .filter(item => item.wrapperType === "track" && item.kind === "song")
        .map(track => ({
          id: `itunes_${track.trackId}`,
          title: track.trackName,
          artist: track.artistName || "Unknown Artist",
          duration: formatDuration(track.trackTimeMillis || 0),
          cover: getHighResArtwork(track.artworkUrl100),
          audio: track.previewUrl || "YT_STREAM",
          isExternal: true,
          source: "itunes"
        }));
    }
    return [];
  } catch (error) {
    console.error("iTunes artist top tracks error:", error);
    return [];
  }
};
