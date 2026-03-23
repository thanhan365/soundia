import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const GOOGLE_CLIENT_ID = '696971772501-p05qnv5pe0fpjb39cgt714mlc7oopcld.apps.googleusercontent.com';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { register, googleLogin } = useContext(AuthContext);
    const navigate = useNavigate();
    const googleBtnRef = useRef(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            return setError('Mật khẩu phải có ít nhất 6 ký tự.');
        }

        const res = await register(username, email, password);
        if (res.success) {
            navigate('/');
        } else {
            setError(typeof res.message === 'string' ? res.message : 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
        }
    };

    // Google Sign-In
    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
            window.google?.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: async (response) => {
                    setError('');
                    const res = await googleLogin(response.credential);
                    if (res.success) {
                        navigate('/');
                    } else {
                        setError(typeof res.message === 'string' ? res.message : 'Đăng nhập Google thất bại');
                    }
                },
            });
            if (googleBtnRef.current) {
                window.google?.accounts.id.renderButton(googleBtnRef.current, {
                    theme: 'filled_black',
                    size: 'large',
                    width: '100%',
                    text: 'signup_with',
                    shape: 'rectangular',
                    logo_alignment: 'center',
                });
            }
        };
        document.head.appendChild(script);
        return () => { script.remove(); };
    }, []); // eslint-disable-line

    return (
        <div className="flex items-center justify-center min-h-screen bg-black">
            <div className="w-full max-w-md p-8 bg-gray-900 rounded-lg shadow-xl">
                <h2 className="mb-6 text-3xl font-bold text-center text-white">Đăng ký</h2>

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

                    <div className="mb-4">
                        <label className="block mb-2 text-sm text-gray-400" htmlFor="email">Địa chỉ email</label>
                        <input
                            type="email"
                            id="email"
                            className="w-full px-4 py-2 text-white bg-gray-800 border border-gray-700 rounded focus:outline-none focus:border-green-500"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
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
                        <p className="mt-1 text-xs text-gray-500">Tối thiểu 6 ký tự.</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full px-4 py-2 font-bold text-white bg-green-500 rounded hover:bg-green-600 transition"
                    >
                        Đăng ký
                    </button>
                </form>

                {/* Divider */}
                <div className="flex items-center my-5">
                    <div className="flex-1 border-t border-gray-700"></div>
                    <span className="px-3 text-sm text-gray-500">hoặc</span>
                    <div className="flex-1 border-t border-gray-700"></div>
                </div>

                {/* Google Sign-In */}
                <div ref={googleBtnRef} className="flex justify-center"></div>

                <p className="mt-4 text-center text-gray-400">
                    Đã có tài khoản? <Link to="/login" className="text-green-500 hover:underline">Đăng nhập</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;
