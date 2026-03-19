import { useState, useRef, useEffect, useCallback } from "react";
import { HiSearch, HiX, HiClock, HiTrendingUp, HiMusicNote } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

export default function SearchBar() {
  const { searchQuery, setSearchQuery, searchHistory, addSearchHistory, clearSearchHistory } = usePlayer();
  const [focused, setFocused] = useState(false);
  const [apiSuggestions, setApiSuggestions] = useState({ keywords: [], songs: [] });
  const [isFetching, setIsFetching] = useState(false);
  const ref = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced API suggest — 300ms after typing stops
  const fetchSuggestions = useCallback((query) => {
    if (abortRef.current) abortRef.current.abort();
    if (!query || query.length < 2) {
      setApiSuggestions({ keywords: [], songs: [] });
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const apiUrl = import.meta.env.VITE_API_URL || '/api';
    fetch(`${apiUrl}/songs/search-suggest?q=${encodeURIComponent(query)}`, { signal: controller.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data && !controller.signal.aborted) {
          setApiSuggestions({ keywords: data.keywords || [], songs: data.songs || [] });
        }
        setIsFetching(false);
      })
      .catch(() => { if (!controller.signal.aborted) setIsFetching(false); });
  }, []);

  // Trigger debounced fetch when query changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setApiSuggestions({ keywords: [], songs: [] });
      return;
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(searchQuery.trim()), 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery, fetchSuggestions]);

  // Cleanup on unmount
  useEffect(() => () => { if (abortRef.current) abortRef.current.abort(); }, []);

  const handleSearch = (query) => {
    setSearchQuery(query);
    addSearchHistory(query);
    setFocused(false);
    navigate("/search");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      addSearchHistory(searchQuery.trim());
      setFocused(false);
      navigate("/search");
    }
  };

  const hasKeywords = apiSuggestions.keywords.length > 0;
  const hasSongs = apiSuggestions.songs.length > 0;
  const hasHistory = searchHistory.length > 0;
  const showDropdown = focused && (hasHistory || hasKeywords || hasSongs || (searchQuery && isFetching));

  return (
    <div ref={ref} className="relative w-full max-w-xl min-w-0">
      {/* Input */}
      <div className="relative flex items-center">
        <HiSearch className="absolute left-3 text-gray-500 text-base pointer-events-none" />
        <input
          type="text"
          placeholder="Tìm bài hát, nghệ sĩ..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKeyDown}
          className="
            w-full pl-10 pr-10 py-3 rounded-full
            bg-white/10 border border-[#2EC4B6]/40 backdrop-blur-md
            text-white text-sm placeholder-gray-400
            hover:border-[#2EC4B6]/60
            focus:outline-none focus:border-[#2EC4B6]/70 focus:bg-white/15
            focus:shadow-[0_0_0_2px_rgba(0,255,200,0.15),0_0_20px_rgba(0,255,200,0.15)]
            shadow-[0_0_8px_rgba(46,196,182,0.1)]
            transition-all duration-200
          "
        />
        {searchQuery && (
          <button
            onClick={() => { setSearchQuery(""); setFocused(true); }}
            className="absolute right-3 text-gray-500 hover:text-gray-300 transition-colors"
          >
            <HiX className="text-base" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in max-h-[70vh] overflow-y-auto">
          {/* ═══ Search history (only when input is empty) ═══ */}
          {!searchQuery && hasHistory && (
            <div>
              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase">Tìm kiếm gần đây</p>
                <button onClick={clearSearchHistory} className="text-xs text-gray-600 hover:text-neon transition-colors">
                  Xóa tất cả
                </button>
              </div>
              {searchHistory.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSearch(q)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                >
                  <HiClock className="text-gray-600 text-sm flex-shrink-0" />
                  <span className="truncate">{q}</span>
                </button>
              ))}
            </div>
          )}

          {/* ═══ Keyword suggestions (from Zing) ═══ */}
          {hasKeywords && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <HiTrendingUp className="text-neon" /> Từ khóa gợi ý
              </p>
              {apiSuggestions.keywords.map((kw, i) => (
                <button
                  key={`kw-${i}`}
                  onClick={() => handleSearch(kw)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors text-left"
                >
                  <HiSearch className="text-gray-600 text-sm flex-shrink-0" />
                  <span className="truncate">{kw}</span>
                </button>
              ))}
            </div>
          )}

          {/* ═══ Song suggestions (from NCT + Zing) ═══ */}
          {hasSongs && (
            <div>
              {hasKeywords && <div className="border-t border-white/5" />}
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase flex items-center gap-1.5">
                <HiMusicNote className="text-neon" /> Bài hát gợi ý
              </p>
              {apiSuggestions.songs.map((song, i) => (
                <button
                  key={`sg-${i}`}
                  onClick={() => handleSearch(song.title)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors group"
                >
                  {song.cover ? (
                    <img src={song.cover} alt={song.title} className="w-9 h-9 rounded-lg object-cover flex-shrink-0 shadow-md" />
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                      <HiMusicNote className="text-gray-600" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white truncate group-hover:text-neon transition-colors">{song.title}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
                  <span className="text-[10px] text-gray-600 uppercase flex-shrink-0">{song.source}</span>
                </button>
              ))}
            </div>
          )}

          {/* Loading indicator */}
          {searchQuery && isFetching && !hasKeywords && !hasSongs && (
            <div className="px-4 py-4 flex items-center justify-center gap-2 text-gray-500 text-sm">
              <div className="w-3.5 h-3.5 border-2 border-neon/30 border-t-neon rounded-full animate-spin" />
              Đang tìm...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
