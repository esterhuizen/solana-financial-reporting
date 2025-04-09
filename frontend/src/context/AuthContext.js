import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  // Load user from local storage on mount
  useEffect(() => {
    let isMounted = true;
    const loadUser = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Set default auth header
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // Verify token by fetching user info
          const res = await axios.get('/api/auth/me');
          
          // Only update state if component is still mounted
          if (isMounted) {
            setUser(res.data);
          }
        }
      } catch (err) {
        console.error('Failed to load user:', err);
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadUser();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []);

  // Login user
  const login = async (username, password) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      
      // Save token and set default header
      localStorage.setItem('token', res.data.token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      
      setUser(res.data.user);
      return true;
    } catch (err) {
      console.error('Login failed:', err);
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    router.push('/auth/login');
  };

  // Register a new user (admin only)
  const registerUser = async (userData) => {
    setLoading(true);
    setError('');
    try {
      const res = await axios.post('/api/auth/register', userData);
      return res.data;
    } catch (err) {
      console.error('Registration failed:', err);
      setError(err.response?.data?.error || 'Failed to register user. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Get all users (admin only)
  const getUsers = async () => {
    // Don't set global loading state here to avoid UI flicker
    try {
      const res = await axios.get('/api/users');
      return res.data;
    } catch (err) {
      console.error('Failed to get users:', err);
      throw err;
    }
  };

  // Delete a user (admin only)
  const deleteUser = async (userId) => {
    // Don't set global loading state here, handled by the component
    try {
      const res = await axios.delete(`/api/users/${userId}`);
      return res.data;
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  };

  const value = {
    user,
    loading,
    error,
    login,
    logout,
    registerUser,
    getUsers,
    deleteUser,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;