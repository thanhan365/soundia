import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { usePlayer } from "../../context/PlayerContext";

function ArtistCard({ artist, onClick }) {
  const [imgFailed, setImgFailed] = useState(false);
  const initial = artist.name.charAt(0).toUpperCase();

  return (
    <div
      onClick={() => onClick(artist)}
      className="flex flex-col items-center gap-2.5 flex-shrink-0 cursor-pointer group w-24 md:w-auto"
    >
      <div className={`relative w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 group-hover:ring-4 group-hover:ring-pink-400/60 transition-all duration-300`}>
        {artist.picture && !imgFailed ? (
          <img
            src={artist.picture}
            alt={artist.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center`}>
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
  const { allSongs } = usePlayer();
  const [artists, setArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (allSongs.length > 0) {
      // Extract unique artists from local songs
      const artistMap = {};
      allSongs.forEach(song => {
        if (song.artist && !artistMap[song.artist]) {
          artistMap[song.artist] = {
            id: song.artist, // using name as ID for local routing
            name: song.artist,
            picture: song.cover || null
          };
        }
      });
      const uniqueArtists = Object.values(artistMap).slice(0, 12);
      setArtists(uniqueArtists);
      setLoading(false);
    }
  }, [allSongs]);

  const handleArtistClick = (artist) => {
    // For now, since it's local, we could route to search or a local artist page
    navigate(`/search?q=${encodeURIComponent(artist.name)}`);
  };

  if (loading) return null; // Or add a skeleton loader here if desired

  if (artists.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-1 h-6 bg-gradient-to-b from-pink-400 to-purple-500 rounded-full" />
        <h2 className="text-xl font-bold text-white">Nghệ Sĩ Nổi Bật</h2>
      </div>

      <div className="flex gap-5 md:gap-8 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-6 lg:grid-cols-8 md:overflow-visible md:pb-0">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} onClick={handleArtistClick} />
        ))}
      </div>
    </section>
  );
}
