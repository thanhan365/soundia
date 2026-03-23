import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (token && storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, refreshToken, id, email, displayName, avatarUrl, role } = response.data;
      const userData = { id, username: response.data.username, email, displayName, avatarUrl, role: role || 'user' };

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data || "Login failed" };
    }
  };

  const register = async (username, email, password) => {
    try {
      const response = await api.post('/auth/register', { username, email, password });
      const { token, refreshToken, id } = response.data;
      const userData = { id, username: response.data.username, email: response.data.email, displayName: response.data.displayName, avatarUrl: response.data.avatarUrl, role: response.data.role || 'user' };

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data || "Registration failed" };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
  };

  const googleLogin = async (idToken) => {
    try {
      const response = await api.post('/auth/google-login', { idToken });
      const { token, refreshToken, id, username, email, displayName, avatarUrl, role } = response.data;
      const userData = { id, username, email, displayName, avatarUrl, role: role || 'user' };

      localStorage.setItem('token', token);
      localStorage.setItem('refreshToken', refreshToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data || "Google login failed" };
    }
  };

  const updateProfile = useCallback(async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
      const updated = { ...user, ...response.data };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data || "Update failed" };
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, register, googleLogin, logout, updateProfile, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
