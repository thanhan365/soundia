import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const res = await login(username, password);
        if (res.success) {
            navigate('/');
        } else {
            setError(typeof res.message === 'string' ? res.message : 'Tên đăng nhập hoặc mật khẩu không đúng');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl">
                <h2 className="mb-6 text-3xl font-bold text-center text-white">Đăng nhập</h2>

                {error && <div className="p-3 mb-4 text-sm text-red-400 bg-red-900/50 rounded">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm text-gray-400" htmlFor="username">Tên đăng nhập</label>
                        <input
                            type="text"
                            id="username"
                            className="w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-green-500"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block mb-2 text-sm text-gray-400" htmlFor="password">Mật khẩu</label>
                        <input
                            type="password"
                            id="password"
                            className="w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-green-500"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-600 transition"
                    >
                        Đăng nhập
                    </button>
                </form>

                <p className="mt-4 text-center text-gray-400">
                    Chưa có tài khoản? <Link to="/register" className="text-green-500 hover:underline">Đăng ký ngay</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;
