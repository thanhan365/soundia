import api from "../utils/api";

const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

export const searchSpotify = async (query) => {
  if (!query) return { tracks: [], artists: [], playlists: [] };
  try {
    const response = await api.get(`/songs/spotify-proxy?query=${encodeURIComponent(query)}&type=track,artist`);
    const data = response.data;
    console.log("Spotify raw data for query:", query, data);
    
    // Parse Tracks
    let tracks = [];
    if (data?.tracks?.items) {
      tracks = data.tracks.items.map((track) => ({
        id: `sp_${track.id}`,
        title: track.name,
        artist: track.artists ? track.artists.map(a => a.name).join(", ") : "Unknown Artist",
        duration: formatDuration(track.duration_ms),
        cover: track.album?.images?.[0]?.url || "",
        audio: track.preview_url || "YT_STREAM",
        isExternal: true,
        source: "spotify"
      }));
    }

    // Parse Artists
    let artists = [];
    if (data?.artists?.items) {
      artists = data.artists.items.map(artist => ({
        id: artist.id,
        name: artist.name,
        picture: artist.images?.[0]?.url || null,
        source: "spotify"
      }));
    }

    // Parse Playlists
    let playlists = [];
    if (data?.playlists?.items) {
      playlists = data.playlists.items.map(playlist => ({
        id: playlist.id,
        title: playlist.name,
        cover: playlist.images?.[0]?.url || null,
        user: playlist.owner?.display_name || "Spotify",
        source: "spotify"
      }));
    }

    return { tracks, artists, playlists };
  } catch (error) {
    console.error("Spotify search proxy error:", error);
    return { tracks: [], artists: [], playlists: [] };
  }
};

export const searchSpotifyArtist = async (query) => {
  if (!query) return null;
  try {
    const response = await api.get(`/songs/spotify-artist-search?query=${encodeURIComponent(query)}`);
    const data = response.data;
    if (data?.artists?.items?.length > 0) {
      return data.artists.items[0]; // Return the most relevant artist match
    }
    return null;
  } catch (error) {
    console.error("Spotify artist search API error:", error);
    return null;
  }
};

export const getSpotifyArtistTopTracks = async (artistId) => {
  if (!artistId) return [];
  try {
    const response = await api.get(`/songs/spotify-artist-top-tracks?artistId=${artistId}`);
    const data = response.data;
    if (data?.tracks) {
      return data.tracks.map((track) => ({
        id: `sp_${track.id}`,
        title: track.name,
        artist: track.artists ? track.artists.map(a => a.name).join(", ") : "Unknown Artist",
        duration: formatDuration(track.duration_ms),
        cover: track.album?.images?.[0]?.url || "",
        audio: track.preview_url || "", 
        isrc: track.external_ids?.isrc, // crucial field for audio matching
        isExternal: true,
        source: "spotify"
      }));
    }
    return [];
  } catch (error) {
    console.error("Spotify artist top tracks API error:", error);
    return [];
  }
};
