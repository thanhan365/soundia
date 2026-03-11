import React, { useState, useEffect, useRef, useContext } from "react";
import { useSearchParams } from "react-router-dom";
import { usePlayer } from "../context/PlayerContext";
import { useToast } from "../context/ToastContext";
import { AuthContext } from "../context/AuthContext";
import { HiPlus } from "react-icons/hi";
import { HiQueueList } from "react-icons/hi2";
import { FaPlay, FaPause, FaHeart, FaRandom, FaEllipsisH, FaShareAlt, FaLink } from "react-icons/fa";
import CreatePlaylistModal from "../components/CreatePlaylistModal";

export default function SuggestedPlaylistDetail() {
    const [searchParams] = useSearchParams();
    const name = searchParams.get("name") || "Playlist";
    const keyword = searchParams.get("q") || "";
    const description = searchParams.get("desc") || "";
    const cover = searchParams.get("cover") || "";
    const gradient = searchParams.get("gradient") || "from-purple-500 to-pink-500";
    const nctKey = searchParams.get("nctKey") || "";
    const zingId = searchParams.get("zingId") || "";
    const autoplay = searchParams.get("autoplay") === "true";

    const [songs, setSongs] = useState([]);
    const [playlistCover, setPlaylistCover] = useState(cover);
    const [loading, setLoading] = useState(true);
    const [songMenu, setSongMenu] = useState(null);
    const [headerPlMenu, setHeaderPlMenu] = useState(false);
    const [createModalSong, setCreateModalSong] = useState(null);
    const menuRef = useRef(null);
    const headerMenuRef = useRef(null);
    const { playSong, currentSong, isPlaying, togglePlay, isFavorite, toggleFavorite, addToQueue, playlists, addSongToPlaylist, createPlaylist } = usePlayer();
    const { showToast } = useToast();
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setSongMenu(null);
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) setHeaderPlMenu(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        const fetchSongs = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5066/api';
                if (zingId) {
                    const res = await fetch(`${apiUrl}/songs/zing-playlist/${zingId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.data?.tracks) {
                            setSongs(data.data.tracks.map(t => ({ ...t, cover: t.cover || t.artwork || '', audio: t.audio || 'YT_STREAM' })));
                            if (data.data.image) setPlaylistCover(data.data.image);
                            return;
                        }
                    }
                }
                if (nctKey) {
                    const res = await fetch(`${apiUrl}/songs/nct-playlist-detail/${nctKey}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.data?.tracks) {
                            setSongs(data.data.tracks.map(t => ({ ...t, cover: t.artwork || t.cover || '', audio: t.audio || t.streamUrl || t.previewUrl || '' })));
                            if (data.data.image) setPlaylistCover(data.data.image);
                            return;
                        }
                    }
                }
                if (!keyword) return;
                const [nctRes, itunesRes] = await Promise.all([
                    fetch(`${apiUrl}/songs/nct-search?keyword=${encodeURIComponent(keyword)}&limit=20`).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch(`${apiUrl}/songs/playlist-songs?keyword=${encodeURIComponent(keyword)}&limit=20`).then(r => r.ok ? r.json() : null).catch(() => null),
                ]);
                const nctSongs = nctRes?.success ? nctRes.data : [];
                const itunesSongs = itunesRes?.success ? itunesRes.data : [];
                const merged = [...nctSongs];
                const seen = new Set(nctSongs.map(s => `${(s.title || '').toLowerCase()}|${(s.artist || '').split(',')[0].trim().toLowerCase()}`));
                for (const s of itunesSongs) {
                    const key = `${(s.title || '').toLowerCase()}|${(s.artist || '').split(',')[0].trim().toLowerCase()}`;
                    if (!seen.has(key)) { merged.push(s); seen.add(key); }
                }
                setSongs(merged.slice(0, 30));
            } catch (err) { console.error("Failed to fetch playlist songs:", err); }
            finally { setLoading(false); }
        };
        fetchSongs();
    }, [nctKey, keyword, zingId]);

    const isCurrentSong = (song) => currentSong?.title === song.title && currentSong?.artist === song.artist;
    const isPlaylistPlaying = isPlaying && songs.some(s => isCurrentSong(s));

    const handlePlayAll = () => { if (songs.length) playSong(songs[0]); };
    const handleToggleAll = () => { isPlaylistPlaying ? togglePlay() : handlePlayAll(); };

    // Autoplay when songs loaded
    const autoplayTriggered = useRef(false);
    useEffect(() => {
        if (autoplay && songs.length > 0 && !loading && !autoplayTriggered.current) {
            autoplayTriggered.current = true;
            playSong(songs[0]);
        }
    }, [autoplay, songs, loading]);
    const handleShufflePlay = () => {
        if (!songs.length) return;
        const shuffled = [...songs].sort(() => Math.random() - 0.5);
        playSong(shuffled[0]);
        shuffled.slice(1).forEach(s => addToQueue(s));
        showToast("Phát ngẫu nhiên", "success");
    };
    const handleAddAllToQueue = () => {
        songs.forEach(s => addToQueue(s));
        showToast(`Đã thêm ${songs.length} bài vào hàng chờ`, "success");
    };

    const handleAddToQueue = (song) => {
        addToQueue(song);
        showToast(`Đã thêm "${song.title}" vào danh sách chờ`, "success");
        setSongMenu(null);
    };

    const handleToggleFavorite = async (song) => {
        const wasLiked = isFavorite(song.id);
        await toggleFavorite({ ...song, isExternal: true });
        showToast(wasLiked ? `Đã bỏ yêu thích "${song.title}"` : `Đã thêm "${song.title}" vào yêu thích`, wasLiked ? "info" : "success");
        setSongMenu(null);
    };

    const handleAddToPlaylist = async (plId, song) => {
        if (!user) { showToast("Vui lòng đăng nhập để thêm vào playlist", "error"); setSongMenu(null); return; }
        try {
            await addSongToPlaylist(plId, { ...song, isExternal: true });
            const pl = playlists.find(p => p.id === plId);
            showToast(`Đã thêm "${song.title}" vào "${pl?.name || 'playlist'}"`, "success");
        } catch (e) { showToast("Lỗi khi thêm vào playlist", "error"); }
        setSongMenu(null);
    };
    const handleCreateAndAdd = (song) => {
        if (!user) { showToast("Vui lòng đăng nhập để tạo playlist", "error"); setSongMenu(null); return; }
        setCreateModalSong({ ...song, isExternal: true });
        setSongMenu(null);
    };
    const handleAddAllToPlaylist = async (plId) => {
        if (!user) { showToast("Vui lòng đăng nhập để thêm vào playlist", "error"); setHeaderPlMenu(false); return; }
        try {
            for (const s of songs) await addSongToPlaylist(plId, { ...s, isExternal: true });
            const pl = playlists.find(p => p.id === plId);
            showToast(`Đã thêm ${songs.length} bài vào "${pl?.name || 'playlist'}"`, "success");
        } catch (e) { showToast("Lỗi khi thêm vào playlist", "error"); }
        setHeaderPlMenu(false);
    };
    const handleCreateAndAddAll = () => {
        if (!user) { showToast("Vui lòng đăng nhập để tạo playlist", "error"); setHeaderPlMenu(false); return; }
        setCreateModalSong({});
        setHeaderPlMenu(false);
    };
    const handleCopyLink = (song) => {
        navigator.clipboard.writeText(`${song.title} - ${song.artist}`).catch(() => {});
        showToast("Đã sao chép liên kết", "success");
        setSongMenu(null);
    };
    const handleShare = (song) => {
        if (navigator.share) navigator.share({ title: song.title, text: `${song.title} - ${song.artist}`, url: window.location.href }).catch(() => {});
        else { navigator.clipboard.writeText(`${song.title} - ${song.artist} | ${window.location.href}`).catch(() => {}); showToast("Đã sao chép để chia sẻ", "success"); }
        setSongMenu(null);
    };

    const formatDuration = (val) => {
        if (!val) return "--:--";
        if (typeof val === 'string' && val.includes(':')) return val;
        const sec = val > 10000 ? val / 1000 : val;
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60);
        return `${m}:${s.toString().padStart(2, "0")}`;
    };

    const hasCover = playlistCover && playlistCover.startsWith('http');

    const getMenuStyle = (menuH = 280) => {
        if (!songMenu) return {};
        const showAbove = songMenu.y + menuH > window.innerHeight;
        return { position: 'fixed', right: Math.max(8, window.innerWidth - songMenu.x), ...(showAbove ? { bottom: window.innerHeight - songMenu.y + 8 } : { top: songMenu.y + 8 }), zIndex: 9999 };
    };

    return (
        <div className="pb-32 px-4 md:px-8 mt-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row items-center md:items-end gap-6 md:gap-8 mb-10 w-full animate-fade-in-up">
                <div className="relative group w-52 h-52 md:w-64 md:h-64 flex-shrink-0">
                    <div className={`absolute -inset-1 bg-gradient-to-r ${gradient.includes('from-') ? gradient : 'from-cyan-400 via-purple-500 to-pink-500'} rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-500`} />
                    {hasCover ? (<img src={playlistCover} alt={name} className="relative w-full h-full object-cover rounded-3xl shadow-xl" onError={(e) => { e.target.style.display = 'none'; if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex'; }} />) : null}
                    <div className={`relative w-full h-full bg-gradient-to-br ${gradient.includes('from-') ? gradient : 'from-purple-600 to-pink-500'} rounded-3xl shadow-xl flex items-center justify-center ${hasCover ? 'hidden' : ''}`}>
                        <span className="text-6xl font-bold text-white/80">{name?.charAt(0)?.toUpperCase() || '♪'}</span>
                    </div>
                </div>
                <div className="flex flex-col text-center md:text-left flex-1 min-w-0">
                    <p className="text-xs md:text-sm text-cyan-400 font-bold uppercase tracking-widest mb-1 md:mb-2">Playlist</p>
                    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl font-black text-white hover:text-transparent hover:bg-clip-text hover:bg-gradient-to-r hover:from-cyan-400 hover:to-purple-500 transition-all duration-300 drop-shadow-lg mb-3 line-clamp-2 md:line-clamp-none">{name}</h1>
                    <div className="flex items-center justify-center md:justify-start gap-2 text-gray-400 text-sm mb-4 md:mb-6"><span>{songs.length} bài hát</span></div>
                    <div className="flex items-center justify-center md:justify-start gap-3">
                        <button onClick={handleToggleAll} disabled={!songs.length} className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white px-8 py-3 rounded-full font-bold shadow-lg shadow-cyan-500/30 hover:shadow-cyan-400/50 transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50">
                            {isPlaylistPlaying ? <FaPause className="w-5 h-5" /> : <FaPlay className="w-5 h-5 ml-1" />}
                            {isPlaylistPlaying ? "Tạm Dừng" : "Phát Nhạc"}
                        </button>
                        <button onClick={handleShufflePlay} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-purple-500/20 hover:border-purple-400/40 text-gray-300 hover:text-purple-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Phát ngẫu nhiên"><FaRandom className="w-4 h-4" /></button>
                        <button onClick={handleAddAllToQueue} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-cyan-500/20 hover:border-cyan-400/40 text-gray-300 hover:text-cyan-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Thêm tất cả vào hàng chờ"><HiQueueList className="w-5 h-5" /></button>
                        <div className="relative">
                            <button onClick={() => setHeaderPlMenu(!headerPlMenu)} className="flex items-center justify-center border border-white/20 bg-white/5 hover:bg-green-500/20 hover:border-green-400/40 text-gray-300 hover:text-green-300 w-12 h-12 rounded-full transition-all active:scale-95" title="Thêm vào playlist"><HiPlus className="w-5 h-5" /></button>
                            {headerPlMenu && (
                                <div ref={headerMenuRef} className="absolute left-0 top-14 z-50 w-56 bg-[#282040] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up">
                                    <p className="px-3 py-1 text-[10px] text-gray-400 uppercase tracking-wider">Thêm tất cả vào playlist</p>
                                    {playlists.length > 0 ? playlists.map(pl => (
                                        <button key={pl.id} onClick={() => handleAddAllToPlaylist(pl.id)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 truncate transition-colors">{pl.name}</button>
                                    )) : <p className="px-3 py-2 text-xs text-gray-500">Chưa có playlist nào</p>}
                                    <div className="border-t border-white/10 mt-1 pt-1">
                                        <button onClick={handleCreateAndAddAll} className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-white/10 flex items-center gap-2 transition-colors"><HiPlus className="w-4 h-4" /> Tạo playlist mới</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Song List */}
            {loading ? (
                <div className="space-y-2">
                    {[...Array(10)].map((_, i) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg">
                            <div className="w-6 text-center"><div className="w-4 h-4 bg-white/5 rounded animate-pulse mx-auto" /></div>
                            <div className="w-12 h-12 rounded-lg bg-white/5 animate-pulse flex-shrink-0" />
                            <div className="flex-1 space-y-2"><div className="w-48 h-4 rounded bg-white/5 animate-pulse" /><div className="w-32 h-3 rounded bg-white/5 animate-pulse" /></div>
                        </div>
                    ))}
                </div>
            ) : songs.length === 0 ? (
                <div className="text-center py-16 text-gray-500"><p className="text-lg">Không tìm thấy bài hát</p></div>
            ) : (
                <div className="bg-white/[0.02] border border-white/5 rounded-3xl backdrop-blur-sm p-2 md:p-6 mb-8 shadow-xl">
                    <div className="hidden md:grid grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_100px] gap-4 px-6 py-3 border-b border-white/5 text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                        <div className="text-center">#</div><div>BÀI HÁT</div><div>NGHỆ SĨ</div><div className="text-right">THỜI GIAN</div>
                    </div>
                    <div className="flex flex-col">
                        {songs.map((song, i) => {
                            const isActive = isCurrentSong(song);
                            const isActivePlaying = isActive && isPlaying;
                            const liked = isFavorite(song.id);
                            return (
                                <div key={song.id || i} onClick={() => playSong(song)}
                                    className={`group grid grid-cols-[40px_1fr_40px] md:grid-cols-[50px_minmax(150px,2fr)_minmax(120px,1fr)_100px] gap-3 md:gap-4 px-2 md:px-6 py-2.5 md:py-3 items-center rounded-xl md:rounded-2xl cursor-pointer transition-all duration-200 ${isActive ? "bg-cyan-500/10 border border-cyan-500/20" : "hover:bg-white/[0.04] border border-transparent"}`}>
                                    <div className="flex justify-center text-sm font-medium text-gray-500">
                                        {isActivePlaying ? (
                                            <div className="flex items-end justify-center w-4 h-4 gap-[2px]">
                                                <div className="w-[3px] bg-cyan-400 animate-[music-bar_1s_ease-in-out_infinite] h-full" />
                                                <div className="w-[3px] bg-cyan-400 animate-[music-bar_0.8s_ease-in-out_infinite_0.2s] h-3/4" />
                                                <div className="w-[3px] bg-cyan-400 animate-[music-bar_1.2s_ease-in-out_infinite_0.4s] h-[80%]" />
                                            </div>
                                        ) : (<span className="group-hover:hidden">{i + 1}</span>)}
                                        <FaPlay className={`w-3 h-3 text-white hidden group-hover:inline-block ${isActivePlaying ? '!hidden' : ''}`} />
                                    </div>
                                    <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                                        <div className="relative w-10 h-10 md:w-12 md:h-12 flex-shrink-0">
                                            <img src={song.artwork || song.cover} alt="" className="w-full h-full object-cover rounded-md md:rounded-lg shadow-sm"
                                                onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%231a1a2e' width='100' height='100'/%3E%3Ctext x='50' y='55' text-anchor='middle' fill='%23555' font-size='30'%3E♫%3C/text%3E%3C/svg%3E"; }} />
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <p className={`text-[13px] md:text-sm font-semibold truncate ${isActive ? "text-cyan-400" : "text-white group-hover:text-cyan-200"}`}>{song.title}</p>
                                            <p className="text-[11px] md:text-xs text-gray-400 truncate md:hidden mt-0.5">{song.artist}</p>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center min-w-0"><p className="text-xs text-gray-400 truncate group-hover:text-gray-300">{song.artist}</p></div>
                                    <div className="flex items-center justify-end gap-2 pr-1">
                                        <button onClick={(e) => { e.stopPropagation(); handleToggleFavorite(song); }}
                                            className={`transition-all opacity-0 lg:group-hover:opacity-100 hover:scale-110 active:scale-90 ${liked ? 'text-pink-500 !opacity-100' : 'text-gray-500 hover:text-pink-400'}`}>
                                            <FaHeart className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={(e) => {
                                            e.stopPropagation();
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            setSongMenu(songMenu?.id === (song.id || i) && !songMenu?.sub ? null : { id: song.id || i, x: rect.right, y: rect.bottom, song });
                                        }} className="text-gray-500 hover:text-white opacity-0 lg:group-hover:opacity-100 transition-all hover:scale-110 active:scale-90">
                                            <FaEllipsisH className="w-4 h-4" />
                                        </button>
                                        <span className="text-[11px] md:text-sm text-gray-500 font-mono w-10 text-right group-hover:text-white transition-colors">{formatDuration(song.duration)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Fixed Context Menu */}
            {songMenu && !songMenu.sub && (
                <div className="fixed inset-0 z-[9998]" onClick={() => setSongMenu(null)}>
                    <div ref={menuRef} style={getMenuStyle(280)} className="w-56 bg-[#282040] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => handleAddToQueue(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                            <HiQueueList className="w-4 h-4 text-cyan-400" /> Thêm vào danh sách chờ
                        </button>
                        <button onClick={() => setSongMenu({ ...songMenu, sub: 'pl' })} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                            <HiPlus className="w-4 h-4 text-green-400" /> Thêm vào playlist
                        </button>
                        <button onClick={() => handleToggleFavorite(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                            <FaHeart className={`w-4 h-4 ${isFavorite(songMenu.song.id) ? 'text-pink-500' : 'text-pink-400'}`} /> {isFavorite(songMenu.song.id) ? 'Bỏ yêu thích' : 'Yêu thích'}
                        </button>
                        <div className="border-t border-white/10 my-1" />
                        <button onClick={() => handleCopyLink(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                            <FaLink className="w-4 h-4 text-gray-400" /> Sao chép liên kết
                        </button>
                        <button onClick={() => handleShare(songMenu.song)} className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 flex items-center gap-3 transition-colors">
                            <FaShareAlt className="w-4 h-4 text-gray-400" /> Chia sẻ
                        </button>
                    </div>
                </div>
            )}

            {songMenu?.sub === 'pl' && (
                <div className="fixed inset-0 z-[9998]" onClick={() => setSongMenu(null)}>
                    <div ref={menuRef} style={getMenuStyle(200)} className="w-56 bg-[#282040] border border-white/10 rounded-xl shadow-2xl py-2 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setSongMenu({ ...songMenu, sub: undefined })} className="w-full text-left px-3 py-1.5 text-[10px] text-gray-400 uppercase tracking-wider hover:bg-white/5 flex items-center gap-1">← Quay lại</button>
                        {playlists.length > 0 ? playlists.map(pl => (
                            <button key={pl.id} onClick={() => handleAddToPlaylist(pl.id, songMenu.song)} className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 truncate transition-colors">{pl.name}</button>
                        )) : <p className="px-3 py-2 text-xs text-gray-500">Chưa có playlist nào</p>}
                        <div className="border-t border-white/10 mt-1 pt-1">
                            <button onClick={() => handleCreateAndAdd(songMenu.song)} className="w-full text-left px-3 py-2 text-sm text-cyan-400 hover:bg-white/10 flex items-center gap-2 transition-colors"><HiPlus className="w-4 h-4" /> Tạo playlist mới</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Playlist Modal */}
            <CreatePlaylistModal
                isOpen={!!createModalSong}
                onClose={() => setCreateModalSong(null)}
                songToAdd={createModalSong?.title ? createModalSong : null}
            />
        </div>
    );
}
