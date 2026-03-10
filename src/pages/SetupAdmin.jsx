import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { HiShieldCheck, HiKey } from 'react-icons/hi';

const SetupAdmin = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (password !== confirm) {
            setError('Mật khẩu xác nhận không khớp');
            return;
        }
        if (password.length < 6) {
            setError('Mật khẩu phải có ít nhất 6 ký tự');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/auth/seed-admin', { username, email, password });
            setSuccess(`Tài khoản admin "${res.data.username}" đã được tạo! Đang chuyển trang đăng nhập...`);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(typeof err.response?.data === 'string' ? err.response.data : 'Lỗi khi tạo tài khoản admin');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[70vh]">
            <div className="w-full max-w-md p-8 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 shadow-2xl">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                        <HiShieldCheck className="text-2xl text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Thiết lập Admin</h2>
                        <p className="text-gray-400 text-sm">Tạo tài khoản quản trị viên</p>
                    </div>
                </div>

                {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900/30 rounded-xl border border-red-500/20">{error}</div>}
                {success && <div className="p-3 mb-4 text-sm text-emerald-400 bg-emerald-900/30 rounded-xl border border-emerald-500/20">{success}</div>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1.5 text-sm text-gray-400">Tên đăng nhập</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                            placeholder="admin"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1.5 text-sm text-gray-400">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                            placeholder="admin@example.com"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1.5 text-sm text-gray-400">Mật khẩu</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <div>
                        <label className="block mb-1.5 text-sm text-gray-400">Xác nhận mật khẩu</label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full px-4 py-3 bg-black/30 border border-white/10 rounded-xl text-white focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 transition-all"
                            placeholder="••••••••"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold rounded-xl hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                    >
                        <HiKey />
                        {loading ? 'Đang tạo...' : 'Tạo tài khoản Admin'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default SetupAdmin;
