import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { HiArrowLeft } from "react-icons/hi";
import { HiPlay, HiMusicalNote } from "react-icons/hi2";

function PlaylistCard({ playlist, onClick, onPlay }) {
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
                <div className={`absolute inset-0 bg-gradient-to-br ${playlist.gradient || "from-purple-500 to-pink-500"} flex items-center justify-center`}>
                    <HiMusicalNote className="text-white/20 text-6xl" />
                </div>
            )}

            {/* Dark overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

            {/* Play button on hover */}
            <button
                onClick={(e) => { e.stopPropagation(); onPlay(playlist); }}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0 z-10"
            >
                <div className="w-11 h-11 bg-neon rounded-full flex items-center justify-center shadow-lg shadow-neon/30 hover:scale-110 transition-transform">
                    <HiPlay className="text-dark text-xl ml-0.5" />
                </div>
            </button>

            {/* Song count badge */}
            {playlist.songCount > 0 && (
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    {playlist.songCount} bài
                </div>
            )}

            {/* Text */}
            <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
                <h3 className="text-white font-bold text-sm md:text-base leading-tight drop-shadow-lg line-clamp-2">
                    {playlist.name}
                </h3>
                {playlist.description && (
                    <p className="text-gray-300 text-[11px] md:text-xs mt-1 line-clamp-1 drop-shadow">
                        {playlist.description}
                    </p>
                )}
            </div>
        </div>
    );
}

export default function AllPlaylists() {
    const [playlists, setPlaylists] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchPlaylists = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';

                const [suggestedRes, dbRes] = await Promise.allSettled([
                    fetch(`${apiUrl}/songs/suggested-playlists`),
                    fetch(`${apiUrl}/admin/public-playlists`),
                ]);

                let external = [];
                if (suggestedRes.status === 'fulfilled' && suggestedRes.value.ok) {
                    const data = await suggestedRes.value.json();
                    if (data.success && data.data) external = data.data;
                }

                let dbPlaylists = [];
                if (dbRes.status === 'fulfilled' && dbRes.value.ok) {
                    const dbData = await dbRes.value.json();
                    dbPlaylists = (dbData || [])
                        .filter(p => p.songCount > 0)
                        .map(p => ({
                            id: `db_${p.id}`,
                            dbId: p.id,
                            name: p.name,
                            description: `${p.songCount} bài hát`,
                            cover: p.cover || '',
                            gradient: 'from-amber-500 to-orange-600',
                            songCount: p.songCount,
                            isDbPlaylist: true,
                        }));
                }

                setPlaylists([...dbPlaylists, ...external]);
            } catch (err) {
                console.error("Failed to fetch playlists:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlaylists();
    }, []);

    const handlePlaylistClick = (playlist) => {
        if (playlist.isDbPlaylist) {
            navigate(`/playlist-detail/${playlist.dbId}`);
            return;
        }
        const params = new URLSearchParams({
            name: playlist.name,
            q: playlist.searchQuery || playlist.name,
            desc: playlist.description || "",
            cover: playlist.cover || "",
            gradient: playlist.gradient || "",
            nctKey: playlist.nctPlaylistKey || "",
            zingId: playlist.zingPlaylistId || "",
        });
        navigate(`/suggested-playlist?${params.toString()}`);
    };

    const handlePlaylistPlay = (playlist) => {
        if (playlist.isDbPlaylist) {
            navigate(`/playlist-detail/${playlist.dbId}?autoplay=true`);
            return;
        }
        const params = new URLSearchParams({
            name: playlist.name,
            q: playlist.searchQuery || playlist.name,
            desc: playlist.description || "",
            cover: playlist.cover || "",
            gradient: playlist.gradient || "",
            nctKey: playlist.nctPlaylistKey || "",
            zingId: playlist.zingPlaylistId || "",
            autoplay: "true",
        });
        navigate(`/suggested-playlist?${params.toString()}`);
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
                        <h1 className="text-2xl md:text-3xl font-bold text-white">
                            🎵 Playlist Nổi Bật
                        </h1>
                        <p className="text-sm text-gray-400 mt-1">
                            {loading ? "Đang tải..." : `${playlists.length} playlist được gợi ý`}
                        </p>
                    </div>
                </div>

                {/* Playlists Grid */}
                {loading ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
                        {[...Array(12)].map((_, i) => (
                            <div key={i} className="aspect-[4/3] rounded-2xl bg-white/5 animate-pulse" />
                        ))}
                    </div>
                ) : playlists.length === 0 ? (
                    <div className="text-center py-20">
                        <HiMusicalNote className="text-6xl text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">Chưa có playlist nào</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 gap-4 md:gap-5">
                        {playlists.map((playlist) => (
                            <PlaylistCard
                                key={playlist.id}
                                playlist={playlist}
                                onClick={handlePlaylistClick}
                                onPlay={handlePlaylistPlay}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
