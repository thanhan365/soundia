import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiPlay } from "react-icons/hi2";
import { HiChevronRight } from "react-icons/hi";

function PlaylistCard({ playlist, onClick }) {
    const [imgFailed, setImgFailed] = useState(false);

    return (
        <div
            onClick={() => onClick(playlist)}
            className="group cursor-pointer relative rounded-2xl overflow-hidden aspect-[4/3] shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.03]"
        >
            {/* Background Image */}
            {playlist.cover && !imgFailed ? (
                <img
                    src={playlist.cover}
                    alt={playlist.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    onError={() => setImgFailed(true)}
                />
            ) : (
                <div className={`absolute inset-0 bg-gradient-to-br ${playlist.gradient || "from-purple-500 to-pink-500"}`} />
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            {/* Play button on hover */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                <div className="w-10 h-10 bg-neon rounded-full flex items-center justify-center shadow-lg shadow-neon/30">
                    <HiPlay className="text-dark text-lg ml-0.5" />
                </div>
            </div>

            {/* Text */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="text-white font-bold text-sm md:text-base leading-tight drop-shadow-lg">
                    {playlist.name}
                </h3>
                <p className="text-gray-300 text-[11px] md:text-xs mt-1 line-clamp-1 drop-shadow">
                    {playlist.description}
                </p>
            </div>
        </div>
    );
}

export default function SuggestedPlaylistSection() {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';
                const res = await fetch(`${apiUrl}/songs/suggested-playlists`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setPlaylists(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch suggested playlists:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylists();
    }, []);

    const handlePlaylistClick = (playlist) => {
        const params = new URLSearchParams({
            name: playlist.name,
            q: playlist.searchQuery,
            desc: playlist.description,
            cover: playlist.cover || "",
            gradient: playlist.gradient || "",
            nctKey: playlist.nctPlaylistKey || "",
            zingId: playlist.zingPlaylistId || "",
        });
        navigate(`/suggested-playlist?${params.toString()}`);
    };

    if (loading) {
        return (
            <section className="mb-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-1 h-6 bg-gradient-to-b from-neon to-emerald-400 rounded-full" />
                        <h2 className="text-xl font-bold text-white">Playlist Gợi Ý</h2>
                    </div>
                    <button
                        onClick={() => navigate('/genres')}
                        className="flex items-center gap-1 text-sm text-gray-400 hover:text-neon transition-colors group"
                    >
                        Xem thêm
                        <HiChevronRight className="text-base group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" />
                    ))}
                </div>
            </section>
        );
    }

    if (playlists.length === 0) return null;

    return (
        <section className="mb-8">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-gradient-to-b from-neon to-emerald-400 rounded-full" />
                    <h2 className="text-xl font-bold text-white">Playlist Gợi Ý</h2>
                </div>
                <button
                    onClick={() => navigate('/genres')}
                    className="flex items-center gap-1 text-sm text-gray-400 hover:text-neon transition-colors group"
                >
                    Xem thêm
                    <HiChevronRight className="text-base group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-3 md:gap-4">
                {playlists.map((playlist) => (
                    <PlaylistCard
                        key={playlist.id}
                        playlist={playlist}
                        onClick={handlePlaylistClick}
                    />
                ))}
            </div>
        </section>
    );
}
