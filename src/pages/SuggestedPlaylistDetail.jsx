import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { HiArrowLeft, HiPlay, HiPause, HiClock } from "react-icons/hi2";
import { HiHeart } from "react-icons/hi";

export default function SuggestedPlaylistDetail() {
    const [searchParams] = useSearchParams();
    const name = searchParams.get("name") || "Playlist";
    const keyword = searchParams.get("q") || "";
    const description = searchParams.get("desc") || "";
    const cover = searchParams.get("cover") || "";
    const gradient = searchParams.get("gradient") || "from-purple-500 to-pink-500";

    const [songs, setSongs] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { playSong, currentSong, isPlaying, togglePlay, isFavorite, toggleFavorite, addToQueue } = usePlayer();

    useEffect(() => {
        if (!keyword) return;
        const fetchSongs = async () => {
            try {
                const res = await fetch(
                    `http://localhost:5066/api/songs/playlist-songs?keyword=${encodeURIComponent(keyword)}&limit=30`
                );
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.data) {
                        setSongs(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch playlist songs:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchSongs();
    }, [keyword]);

    const handlePlayAll = () => {
        if (songs.length > 0) {
            // Add remaining songs to queue, then play first
            songs.slice(1).forEach(s => addToQueue(s));
            playSong(songs[0]);
        }
    };

    const handlePlaySong = (song, index) => {
        // Add subsequent songs to queue
        songs.slice(index + 1).forEach(s => addToQueue(s));
        playSong(song);
    };

    const formatDuration = (sec) => {
        if (!sec) return "--:--";
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const isCurrentSong = (song) => currentSong?.title === song.title && currentSong?.artist === song.artist;

    return (
        <div className="min-h-screen text-white pb-32">
            <div className="mx-auto max-w-5xl">
                {/* Header Banner */}
                <div className="relative rounded-2xl overflow-hidden mb-8">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60`} />
                    {cover && (
                        <img
                            src={cover}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm"
                        />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-transparent to-transparent" />

                    <div className="relative flex items-end gap-6 p-6 md:p-8 min-h-[200px] md:min-h-[260px]">
                        {/* Cover */}
                        <div className="w-32 h-32 md:w-44 md:h-44 rounded-xl overflow-hidden shadow-2xl flex-shrink-0 ring-2 ring-white/20">
                            {cover ? (
                                <img src={cover} alt={name} className="w-full h-full object-cover" />
                            ) : (
                                <div className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}>
                                    <span className="text-4xl font-black text-white/80">♫</span>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-300 uppercase tracking-wider mb-1">Playlist</p>
                            <h1 className="text-2xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">{name}</h1>
                            <p className="text-sm text-gray-300 mb-4">{description}</p>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={handlePlayAll}
                                    disabled={songs.length === 0}
                                    className="flex items-center gap-2 bg-neon text-dark px-6 py-2.5 rounded-full font-bold text-sm hover:bg-neon/90 transition-all hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 shadow-lg shadow-neon/20"
                                >
                                    <HiPlay className="text-lg" />
                                    Phát tất cả
                                </button>
                                <span className="text-sm text-gray-400">{songs.length} bài hát</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Back button */}
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 text-sm"
                >
                    <HiArrowLeft /> Quay lại
                </button>

                {/* Song List */}
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(10)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
                                <div className="w-6 text-center">
                                    <div className="w-4 h-4 bg-white/5 rounded animate-pulse mx-auto" />
                                </div>
                                <div className="w-12 h-12 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                                <div className="flex-1 space-y-2">
                                    <div className="w-48 h-4 rounded bg-white/5 animate-pulse" />
                                    <div className="w-32 h-3 rounded bg-white/5 animate-pulse" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : songs.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">
                        <p className="text-lg">Không tìm thấy bài hát</p>
                    </div>
                ) : (
                    <div className="space-y-0.5">
                        {/* Table Header */}
                        <div className="flex items-center gap-4 px-3 py-2 text-xs text-gray-500 uppercase tracking-wider border-b border-white/5 mb-1">
                            <div className="w-6 text-center">#</div>
                            <div className="w-12 flex-shrink-0" />
                            <div className="flex-1">Tiêu đề</div>
                            <div className="hidden sm:block w-40">Nghệ sĩ</div>
                            <div className="w-14 text-right flex items-center justify-end gap-1">
                                <HiClock className="text-sm" />
                            </div>
                        </div>

                        {songs.map((song, index) => {
                            const active = isCurrentSong(song);
                            const liked = isFavorite(song.id);

                            return (
                                <div
                                    key={song.id}
                                    onClick={() => handlePlaySong(song, index)}
                                    className={`flex items-center gap-4 px-3 py-2.5 rounded-lg cursor-pointer group transition-all ${active
                                        ? "bg-neon/10 text-neon"
                                        : "hover:bg-white/5 text-gray-300"
                                        }`}
                                >
                                    {/* Number / Play icon */}
                                    <div className="w-6 text-center text-sm flex-shrink-0">
                                        {active && isPlaying ? (
                                            <div className="flex items-center justify-center gap-[2px]">
                                                <span className="w-[3px] h-3 bg-neon rounded-full animate-pulse" />
                                                <span className="w-[3px] h-4 bg-neon rounded-full animate-pulse [animation-delay:0.15s]" />
                                                <span className="w-[3px] h-2 bg-neon rounded-full animate-pulse [animation-delay:0.3s]" />
                                            </div>
                                        ) : (
                                            <span className="group-hover:hidden">{index + 1}</span>
                                        )}
                                        {!active && (
                                            <HiPlay className="hidden group-hover:block text-white mx-auto" />
                                        )}
                                    </div>

                                    {/* Cover */}
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        <img
                                            src={song.cover}
                                            alt=""
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%231a1a2e' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23555' font-size='30'%3E♫%3C/text%3E%3C/svg%3E";
                                            }}
                                        />
                                    </div>

                                    {/* Title */}
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${active ? "text-neon" : "text-white"}`}>
                                            {song.title}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate sm:hidden">{song.artist}</p>
                                    </div>

                                    {/* Artist (desktop) */}
                                    <div className="hidden sm:block w-40 truncate text-sm text-gray-500">
                                        {song.artist}
                                    </div>

                                    {/* Like */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(song.id);
                                        }}
                                        className={`opacity-0 group-hover:opacity-100 transition-opacity p-1 ${liked ? "!opacity-100 text-red-500" : "text-gray-600"
                                            }`}
                                    >
                                        <HiHeart className="text-sm" />
                                    </button>

                                    {/* Duration */}
                                    <div className="w-14 text-right text-xs text-gray-500">
                                        {formatDuration(song.duration)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
