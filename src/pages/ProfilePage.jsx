import { useContext, useState, useEffect, useRef } from "react";
import { AuthContext } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { Navigate } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import { HiUser, HiMail, HiClock, HiHeart, HiCollection, HiPencil, HiCheck, HiMusicNote, HiChartBar } from "react-icons/hi";
import api from "../utils/api";

export default function ProfilePage() {
    const { user, logout, updateProfile } = useContext(AuthContext);
    const { playlists, favorites, recentHistory } = usePlayer();
    const [stats, setStats] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [displayName, setDisplayName] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (!user) return;
        setDisplayName(user.displayName || user.username || "");
        setAvatarUrl(user.avatarUrl || "");

        // Fetch listening stats
        api.get("/history/stats").then(res => setStats(res.data)).catch(() => { });
    }, [user]);

    if (!user) return <Navigate to="/login" replace />;

    const handleSaveProfile = async () => {
        await updateProfile({ displayName, avatarUrl });
        setIsEditing(false);
    };

    const handleAvatarUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setAvatarUrl(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const formatTime = (seconds) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return `${h}h ${m}m`;
        return `${m} phút`;
    };

    return (
        <div className="space-y-8 pb-32 max-w-4xl mx-auto">
            <HeroSection
                icon={HiUser}
                label="Hồ sơ cá nhân"
                title={<>Xin chào, <span className="text-neon text-glow">{displayName || user.username}</span></>}
                description="Quản lý thông tin tài khoản và thống kê cá nhân"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Info Card */}
                <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                    {/* Avatar */}
                    <div
                        className="relative w-24 h-24 rounded-full mb-4 cursor-pointer group"
                        onClick={() => isEditing && fileInputRef.current?.click()}
                    >
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover border-2 border-neon" />
                        ) : (
                            <div className="w-full h-full rounded-full bg-gradient-to-br from-neon/40 to-purple-500/40 flex items-center justify-center border-2 border-neon">
                                <span className="text-4xl font-bold text-white uppercase">{(displayName || user.username).charAt(0)}</span>
                            </div>
                        )}
                        {isEditing && (
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <HiPencil className="text-white text-xl" />
                            </div>
                        )}
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                    </div>

                    {isEditing ? (
                        <input
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="text-xl font-bold text-white bg-white/10 border border-white/20 rounded-lg px-3 py-1 mb-1 text-center w-full"
                            placeholder="Tên hiển thị"
                        />
                    ) : (
                        <h2 className="text-xl font-bold text-white mb-1">{displayName || user.username}</h2>
                    )}
                    <p className="text-gray-400 text-sm flex items-center gap-2 mb-4">
                        <HiMail className="text-neon" /> {user.email || "Chưa có email"}
                    </p>

                    <div className="flex gap-2 w-full">
                        {isEditing ? (
                            <button
                                onClick={handleSaveProfile}
                                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold flex items-center justify-center gap-2 hover:from-green-500 hover:to-emerald-500 transition-all"
                            >
                                <HiCheck /> Lưu
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="flex-1 py-2.5 rounded-xl border border-neon/50 text-neon font-semibold hover:bg-neon/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <HiPencil /> Sửa hồ sơ
                            </button>
                        )}
                    </div>

                    <button
                        onClick={logout}
                        className="w-full py-2.5 rounded-xl border border-red-500/50 text-red-400 font-semibold hover:bg-red-500/10 transition-colors mt-3"
                    >
                        Đăng xuất
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="md:col-span-2 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <StatCard
                            label="Đã nghe gần đây"
                            value={recentHistory.length}
                            icon={HiClock}
                            color="neon"
                        />
                        <StatCard
                            label="Yêu thích"
                            value={favorites.length}
                            icon={HiHeart}
                            color="pink"
                        />
                        <StatCard
                            label="Playlist đã tạo"
                            value={playlists.length}
                            icon={HiCollection}
                            color="purple"
                        />
                        <StatCard
                            label="Tổng thời gian nghe"
                            value={stats ? formatTime(stats.totalListeningSeconds) : "—"}
                            icon={HiChartBar}
                            color="cyan"
                        />
                    </div>

                    {/* Top Songs */}
                    {stats?.topSongs?.length > 0 && (
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <HiMusicNote className="text-neon" /> Top bài hát nghe nhiều nhất
                            </h3>
                            <div className="space-y-3">
                                {stats.topSongs.map((song, i) => (
                                    <div key={song.songId} className="flex items-center gap-3 group">
                                        <span className="w-6 text-center text-sm font-bold text-gray-500">#{i + 1}</span>
                                        {song.coverUrl ? (
                                            <img src={song.coverUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                                                <HiMusicNote className="text-gray-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-white text-sm font-medium truncate">{song.title}</p>
                                            <p className="text-gray-400 text-xs truncate">{song.artist}</p>
                                        </div>
                                        <span className="text-gray-500 text-xs">{song.playCount} lần</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color }) {
    const colorMap = {
        neon: { bg: "bg-neon/10", text: "text-neon", hover: "hover:border-neon/30" },
        pink: { bg: "bg-pink-500/10", text: "text-pink-400", hover: "hover:border-pink-500/30" },
        purple: { bg: "bg-purple-500/10", text: "text-purple-400", hover: "hover:border-purple-500/30" },
        cyan: { bg: "bg-cyan-500/10", text: "text-cyan-400", hover: "hover:border-cyan-500/30" },
    };
    const c = colorMap[color] || colorMap.neon;

    return (
        <div className={`bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between group ${c.hover} transition-colors`}>
            <div>
                <p className="text-gray-400 text-sm font-medium mb-1">{label}</p>
                <h3 className={`text-3xl font-black text-white group-hover:${c.text} transition-colors`}>{value}</h3>
            </div>
            <div className={`w-12 h-12 rounded-full ${c.bg} flex items-center justify-center ${c.text}`}>
                <Icon className="text-2xl" />
            </div>
        </div>
    );
}
