import { useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { usePlayer } from "../context/PlayerContext";
import { Navigate } from "react-router-dom";
import HeroSection from "../components/HeroSection";
import { HiUser, HiMail, HiClock, HiHeart, HiCollection } from "react-icons/hi";

export default function ProfilePage() {
    const { user, logout } = useContext(AuthContext);
    const { allSongs, playlists, recentHistory } = usePlayer();

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const favoriteCount = allSongs.filter(s => s.isFavorite).length;

    return (
        <div className="space-y-8 pb-32 max-w-4xl mx-auto">
            <HeroSection
                icon={HiUser}
                label="Hồ sơ cá nhân"
                title={<>Xin chào, <span className="text-neon text-glow">{user.username}</span></>}
                description="Quản lý thông tin tài khoản và thống kê cá nhân"
            />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Info Card */}
                <div className="md:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon/40 to-purple-500/40 flex items-center justify-center mb-4 border-2 border-neon flex-shrink-0">
                        <span className="text-4xl font-bold text-white uppercase">{user.username.charAt(0)}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-1">{user.username}</h2>
                    <p className="text-gray-400 text-sm flex items-center gap-2 mb-6">
                        <HiMail className="text-neon" /> {user.email || "Chưa có email"}
                    </p>

                    <button
                        onClick={logout}
                        className="w-full py-2.5 rounded-xl border border-red-500/50 text-red-400 font-semibold hover:bg-red-500/10 transition-colors"
                    >
                        Đăng xuất
                    </button>
                </div>

                {/* Stats Grid */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:border-neon/30 transition-colors">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Đã nghe gần đây</p>
                            <h3 className="text-3xl font-black text-white group-hover:text-neon transition-colors">{recentHistory.length}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-neon/10 flex items-center justify-center text-neon">
                            <HiClock className="text-2xl" />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:border-pink-500/30 transition-colors">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Yêu thích</p>
                            <h3 className="text-3xl font-black text-white group-hover:text-pink-400 transition-colors">{favoriteCount}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-pink-500/10 flex items-center justify-center text-pink-400">
                            <HiHeart className="text-2xl" />
                        </div>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center justify-between group hover:border-purple-500/30 transition-colors sm:col-span-2">
                        <div>
                            <p className="text-gray-400 text-sm font-medium mb-1">Playlist đã tạo</p>
                            <h3 className="text-3xl font-black text-white group-hover:text-purple-400 transition-colors">{playlists.length}</h3>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-400">
                            <HiCollection className="text-2xl" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
