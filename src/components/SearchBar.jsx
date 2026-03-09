import { useState, useRef, useEffect } from "react";
import { HiSearch, HiX, HiClock } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";

export default function SearchBar() {
  const { searchQuery, setSearchQuery, searchHistory, addSearchHistory, clearSearchHistory, allSongs } = usePlayer();
  const [focused, setFocused] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setFocused(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Smart suggestions based on current input
  const suggestions = searchQuery.length >= 1
    ? allSongs
      .filter(
        (s) =>
          s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.artist.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .slice(0, 5)
    : [];

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

  const showDropdown = focused && (searchHistory.length > 0 || suggestions.length > 0);

  return (
    <div ref={ref} className="relative w-full max-w-lg">
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
            w-full pl-10 pr-10 py-2 rounded-full
            bg-[#0a1628]/80 border border-neon/15
            text-white text-sm placeholder-gray-500
            focus:outline-none focus:border-neon/40 focus:bg-[#0a1628]
            focus:shadow-[0_0_15px_rgba(29,185,144,0.15)]
            shadow-[0_0_8px_rgba(29,185,144,0.06)]
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
        <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 animate-fade-in">
          {/* Search history */}
          {!searchQuery && searchHistory.length > 0 && (
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

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <p className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Gợi ý</p>
              {suggestions.map((song) => (
                <button
                  key={song.id}
                  onClick={() => handleSearch(song.title)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-white/5 transition-colors"
                >
                  <img src={song.cover} alt={song.title} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{song.title}</p>
                    <p className="text-xs text-gray-500 truncate">{song.artist}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
