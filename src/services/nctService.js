import axios from "axios";

const api = axios.create({ baseURL: "/api/songs" });

// ── Frontend cache for resolved stream URLs (avoids re-querying on repeat plays) ──
const _streamCache = new Map();
const CACHE_MAX = 100;

/**
 * Search NCT songs (with stream URLs from backend)
 */
export const searchNctSongs = async (keyword, limit = 20) => {
  if (!keyword) return { tracks: [] };
  try {
    const res = await api.get(`/nct-search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`);
    if (res.data?.success && res.data.data) {
      const tracks = res.data.data.map(s => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        cover: s.cover,
        audio: s.audio,            // stream.nct.vn URL or "YT_STREAM"
        isExternal: true,
        source: "nct",
        duration: formatDur(s.duration),
        durationSec: s.duration,
        nctKey: s.nctKey,
      }));
      return { tracks };
    }
    return { tracks: [] };
  } catch (err) {
    console.error("[NCT] Search error:", err);
    return { tracks: [] };
  }
};

/**
 * Get stream URL for a single NCT song by key
 */
export const getNctStreamUrl = async (nctKey) => {
  try {
    const res = await api.get(`/nct-stream/${nctKey}`);
    return res.data?.success ? res.data.streamUrl : null;
  } catch { return null; }
};

/**
 * Resolve NCT stream URL by song title + artist (for any source)
 * Searches NCT for a matching song and returns its stream URL
 */
export const resolveNctStream = async (title, artist) => {
  const cacheKey = `${(title||'').toLowerCase()}|${(artist||'').toLowerCase()}`;
  // Check cache first
  if (_streamCache.has(cacheKey)) return _streamCache.get(cacheKey);
  // Check negative cache (avoid re-trying failed lookups repeatedly)
  if (_streamCache.has(`_neg_${cacheKey}`)) return null;

  try {
    const res = await api.get(`/nct-resolve?title=${encodeURIComponent(title)}&artist=${encodeURIComponent(artist || "")}`);
    const url = res.data?.success ? res.data.streamUrl : null;
    if (url) {
      if (_streamCache.size >= CACHE_MAX) _streamCache.clear();
      _streamCache.set(cacheKey, url);
    } else {
      // Cache negative result for 60s
      _streamCache.set(`_neg_${cacheKey}`, true);
      setTimeout(() => _streamCache.delete(`_neg_${cacheKey}`), 60000);
    }
    return url;
  } catch { return null; }
};

/**
 * Get NCT charts list
 */
export const getNctCharts = async () => {
  try {
    const res = await api.get("/nct-charts");
    return res.data?.success ? res.data.data : [];
  } catch { return []; }
};

/**
 * Get NCT Top 100
 */
export const getNctTop100 = async () => {
  try {
    const res = await api.get("/nct-top100");
    return res.data?.success ? res.data.data : [];
  } catch { return []; }
};

function formatDur(sec) {
  if (!sec) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
