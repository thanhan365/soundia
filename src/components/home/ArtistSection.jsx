import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

function ArtistCard({ artist, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = artist.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={() => onClick(artist)}
      className="flex flex-col items-center gap-2.5 flex-shrink-0 cursor-pointer group w-24 md:w-auto"
    >
      <div className="relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 group-hover:ring-4 group-hover:ring-pink-400/60 transition-all duration-300">
        {artist.picture && !imgFailed ? (
          <img
            src={artist.picture}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
            <span className="text-3xl md:text-4xl font-black text-white drop-shadow-lg">
              {initial}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full" />
      </div>

      <h3 className="text-white font-semibold text-xs md:text-sm text-center leading-tight truncate max-w-[90px] md:max-w-none group-hover:text-pink-300 transition-colors">
        {artist.name}
      </h3>
    </div>
  );
}

export default function ArtistSection() {
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchArtists = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';
        const res = await fetch(`${apiUrl}/songs/nct-artists`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            setArtists(data.data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch NCT artists:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchArtists();
  }, []);

  const handleArtistClick = (artist) => {
    navigate(`/search?q=${encodeURIComponent(artist.name)}`);
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-1 h-6 bg-gradient-to-b from-pink-400 to-purple-500 rounded-full" />
          <h2 className="text-xl font-bold text-white">Nghệ Sĩ Nổi Bật</h2>
        </div>
        <div className="flex gap-5 md:gap-8 overflow-x-auto pb-4 scrollbar-hide">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex flex-col items-center gap-2.5 flex-shrink-0">
              <div className="w-20 h-20 md:w-28 md:h-28 rounded-full bg-white/5 animate-pulse" />
              <div className="w-16 h-3 rounded bg-white/5 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (artists.length === 0) return null;

  // Chỉ hiện 8 artist trên trang Home
  const displayArtists = artists.slice(0, 8);

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-pink-400 to-purple-500 rounded-full" />
          <h2 className="text-xl font-bold text-white">Nghệ Sĩ Nổi Bật</h2>
        </div>
        {artists.length > 8 && (
          <Link
            to="/artists"
            className="text-sm text-neon hover:text-neon/80 transition-colors font-medium flex items-center gap-1"
          >
            Xem thêm
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        )}
      </div>

      <div className="flex gap-5 md:gap-8 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-8 md:overflow-visible md:pb-0">
        {displayArtists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} onClick={handleArtistClick} />
        ))}
      </div>
    </section>
  );
}
