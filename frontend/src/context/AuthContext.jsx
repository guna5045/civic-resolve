import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          setUser(JSON.parse(savedUser));
          // Refresh profile data to sync points/badges
          const res = await api.get('/auth/profile');
          if (res.data.success) {
            setUser(res.data.data);
            localStorage.setItem('user', JSON.stringify(res.data.data));
          }
        } catch (err) {
          console.error('Failed to restore user profile, logging out...', err);
          logout();
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const getErrorMessage = (err, defaultMsg) => {
    if (err.response?.data?.message) {
      return err.response.data.message;
    }
    if (err.response?.data?.errors && Array.isArray(err.response.data.errors)) {
      return err.response.data.errors.map(e => e.msg).join(', ');
    }
    return err.message || defaultMsg;
  };

  const login = async (identifier, password, role, departmentId) => {
    setError(null);
    try {
      const res = await api.post('/auth/login', { identifier, password, role, departmentId });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        // Refresh full profile data
        const profileRes = await api.get('/auth/profile');
        if (profileRes.data.success) {
          setUser(profileRes.data.data);
          localStorage.setItem('user', JSON.stringify(profileRes.data.data));
        }
        return profileRes.data.data;
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Login failed. Please check credentials.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const register = async (fullName, email, mobile, password) => {
    setError(null);
    try {
      const res = await api.post('/auth/register', { fullName, email, mobile, password });
      return res.data;
    } catch (err) {
      const msg = getErrorMessage(err, 'Registration failed.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const verifyOtp = async (email, otp) => {
    setError(null);
    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        // Refresh full profile data
        const profileRes = await api.get('/auth/profile');
        if (profileRes.data.success) {
          setUser(profileRes.data.data);
          localStorage.setItem('user', JSON.stringify(profileRes.data.data));
        }
        return profileRes.data.data;
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'OTP verification failed.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const resendOtp = async (email) => {
    setError(null);
    try {
      const res = await api.post('/auth/resend-otp', { email });
      return res.data;
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to resend OTP.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async (credential) => {
    setError(null);
    try {
      const res = await api.post('/auth/google', { credential });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        // Refresh full profile data
        const profileRes = await api.get('/auth/profile');
        if (profileRes.data.success) {
          setUser(profileRes.data.data);
          localStorage.setItem('user', JSON.stringify(profileRes.data.data));
        }
        return profileRes.data.data;
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Google login failed.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const demoLogin = async (role, departmentId) => {
    setError(null);
    try {
      const res = await api.post('/auth/demo', { role, departmentId });
      if (res.data.success) {
        const { token, ...userData } = res.data.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        setUser(userData);
        // Refresh full profile data
        const profileRes = await api.get('/auth/profile');
        if (profileRes.data.success) {
          setUser(profileRes.data.data);
          localStorage.setItem('user', JSON.stringify(profileRes.data.data));
        }
        return profileRes.data.data;
      }
    } catch (err) {
      const msg = getErrorMessage(err, 'Demo login failed.');
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const res = await api.get('/auth/profile');
      if (res.data.success) {
        setUser(res.data.data);
        localStorage.setItem('user', JSON.stringify(res.data.data));
      }
    } catch (err) {
      console.error('Error refreshing profile info:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, verifyOtp, resendOtp, loginWithGoogle, logout, refreshUser, demoLogin }}>
      {children}
    </AuthContext.Provider>
  );
};
export default AuthContext;
