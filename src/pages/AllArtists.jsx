import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";

function ArtistCard({ artist, onClick }) {
    const [imgFailed, setImgFailed] = useState(false);
    const initial = artist.name.charAt(0).toUpperCase();

    return (
        <div
            onClick={() => onClick(artist)}
            className="flex flex-col items-center gap-3 cursor-pointer group"
        >
            <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full overflow-hidden shadow-lg ring-2 ring-white/10 group-hover:ring-4 group-hover:ring-pink-400/60 transition-all duration-300">
                {artist.picture && !imgFailed ? (
                    <img
                        src={artist.picture}
                        alt={artist.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        onError={() => setImgFailed(true)}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                        <span className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                            {initial}
                        </span>
                    </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
            <h3 className="text-white font-semibold text-sm text-center leading-tight group-hover:text-pink-300 transition-colors max-w-[120px] truncate">
                {artist.name}
            </h3>
        </div>
    );
}

export default function AllArtists() {
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

    return (
        <div className="min-h-screen text-white pb-32">
            <div className="px-4 sm:px-6 md:px-8 pt-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <HiArrowLeft className="text-xl text-white" />
                    </button>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-white">Nghệ Sĩ Nổi Bật</h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {artists.length} nghệ sĩ trending từ NhacCuaTui
                        </p>
                    </div>
                </div>

                {/* Artists Grid */}
                {loading ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-6 md:gap-8">
                        {[...Array(16)].map((_, i) => (
                            <div key={i} className="flex flex-col items-center gap-3">
                                <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full bg-white/5 animate-pulse" />
                                <div className="w-20 h-3 rounded bg-white/5 animate-pulse" />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-6 md:gap-8">
                        {artists.map((artist) => (
                            <ArtistCard key={artist.id} artist={artist} onClick={handleArtistClick} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
