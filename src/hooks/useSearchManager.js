import { useState, useEffect, useRef } from "react";
import { searchItunes } from "../services/iTunesService";
import { searchNctSongs, searchNctPlaylists } from "../services/nctService";
import { normalizeVietnamese } from "../utils/textUtils";

/**
 * useSearchManager — search across NCT + iTunes with debounce
 */
export function useSearchManager({ allSongs }) {
    const [searchQuery, setSearchQuery] = useState("");
    const [filteredSongs, setFilteredSongs] = useState(allSongs);
    const [searchArtistsResult, setSearchArtistsResult] = useState([]);
    const [searchPlaylistsResult, setSearchPlaylistsResult] = useState([]);
    const [searchHistory, setSearchHistory] = useState(() =>
        JSON.parse(localStorage.getItem("soundia_search_history")) || []
    );

    // Keep a ref to allSongs so search effect doesn't re-trigger when allSongs changes
    const allSongsRef = useRef(allSongs);
    useEffect(() => { allSongsRef.current = allSongs; }, [allSongs]);

    // Sync filteredSongs when allSongs changes and no search query
    useEffect(() => {
        if (!searchQuery.trim()) setFilteredSongs(allSongs);
    }, [allSongs, searchQuery]);

    // Debounced search effect — only re-runs when searchQuery changes
    useEffect(() => {
        let cancelled = false; // Abort guard for stale queries
        const handle = async () => {
            const rawQ = searchQuery.trim();
            const q = rawQ.toLowerCase();
            const currentSongs = allSongsRef.current;
            if (!q) {
                setFilteredSongs(currentSongs);
                setSearchArtistsResult([]);
                setSearchPlaylistsResult([]);
                return;
            }

            const local = currentSongs.filter(
                (s) => s.title.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
            );

            // Show local results IMMEDIATELY (no waiting for APIs)
            setFilteredSongs(local);

            const apiUrl = import.meta.env.VITE_API_URL || '/api';
            const [nctResults, itunesResults, localDbResults, nctPlaylists, zingResults] = await Promise.all([
                searchNctSongs(rawQ, 15),
                searchItunes(rawQ),
                fetch(`${apiUrl}/songs/search-local?q=${encodeURIComponent(rawQ)}&limit=10`)
                    .then(r => r.ok ? r.json() : { data: [] })
                    .catch(() => ({ data: [] })),
                searchNctPlaylists(rawQ, 6),
                fetch(`${apiUrl}/songs/zing-search?q=${encodeURIComponent(rawQ)}&limit=10`)
                    .then(r => r.ok ? r.json() : { songs: [] })
                    .catch(() => ({ songs: [] })),
            ]);

            // Abort if user typed something else while APIs were loading
            if (cancelled) return;

            // Local DB songs (admin-imported) go first
            const localDbTracks = (localDbResults.data || []).map(s => ({
                id: s.id, title: s.title, artist: s.artist, cover: s.cover,
                audio: s.audio, source: s.source || 'local', duration: s.duration,
                isExternal: true,
            }));

            const generateKey = (track) => {
                const title = normalizeVietnamese(track.title).replace(/[^a-z0-9]/g, "");
                const artist = normalizeVietnamese(track.artist).replace(/[^a-z0-9]/g, "");
                return `${title}_${artist}`;
            };

            // Build seen set from local results first to avoid duplicates
            const seenKeys = new Set(local.map(t => generateKey(t)));
            const externalTracks = [];

            // Zing tracks (from backend zing-search endpoint)
            const zingTracks = (zingResults.songs || []).map(s => ({
                ...s,
                isExternal: true,
            }));

            // Add localDB, NCT, iTunes, Zing — skip if already seen
            const allExternal = [...localDbTracks, ...(nctResults.tracks || []), ...(itunesResults.tracks || []), ...zingTracks];
            for (const track of allExternal) {
                const key = generateKey(track);
                if (!seenKeys.has(key)) {
                    externalTracks.push(track);
                    seenKeys.add(key);
                }
            }

            // ── Artists: extract from NCT results (priority) + iTunes ──
            const artistMap = new Map();
            // NCT artists first — extract unique artists from NCT song results
            for (const track of (nctResults.tracks || [])) {
                const name = track.artist;
                if (!name || artistMap.has(name.toLowerCase())) continue;
                artistMap.set(name.toLowerCase(), {
                    id: encodeURIComponent(name),
                    name: name,
                    picture: track.cover || "",
                    source: "nct",
                });
            }
            // Then iTunes artists
            for (const a of (itunesResults.artists || [])) {
                if (!a.name || artistMap.has(a.name.toLowerCase())) continue;
                artistMap.set(a.name.toLowerCase(), a);
            }
            const mergedArtists = Array.from(artistMap.values());

            // ── Playlists: NCT (priority) + iTunes albums ──
            const plSeenTitles = new Set();
            const mergedPlaylists = [];
            for (const pl of [...nctPlaylists, ...(itunesResults.playlists || [])]) {
                const key = (pl.title || "").toLowerCase();
                if (key && !plSeenTitles.has(key)) {
                    plSeenTitles.add(key);
                    mergedPlaylists.push(pl);
                }
            }

            // Merge API results with local (only if query hasn't changed)
            if (!cancelled) {
                setFilteredSongs([...local, ...externalTracks]);
                setSearchArtistsResult(mergedArtists);
                setSearchPlaylistsResult(mergedPlaylists);
            }
        };
        const t = setTimeout(handle, 500);
        return () => { clearTimeout(t); cancelled = true; };
    }, [searchQuery]); // Only re-run when searchQuery changes, not allSongs

    // Persist search history
    useEffect(() => {
        localStorage.setItem("soundia_search_history", JSON.stringify(searchHistory));
    }, [searchHistory]);

    const addSearchHistory = (q) => {
        if (!q.trim()) return;
        setSearchHistory((p) => [q, ...p.filter((x) => x !== q)].slice(0, 10));
    };

    const clearSearchHistory = () => setSearchHistory([]);

    return {
        searchQuery, setSearchQuery,
        filteredSongs, setFilteredSongs,
        searchArtistsResult, searchPlaylistsResult,
        searchHistory, addSearchHistory, clearSearchHistory,
    };
}
