import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

// 1. Define the base URL using the environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
        const res = await axios.get(`${API_BASE_URL}/api/auth/user`, {
            withCredentials: true,
            timeout: 30000 // Increase timeout to 30 seconds
        });
      
      if (res.data.authenticated) {
        setUser(res.data.user);
      }
    } catch (error) {
      console.log('User not authenticated');
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      // 3. Use the dynamic API_BASE_URL for the logout request
      await axios.get(`${API_BASE_URL}/auth/logout`, {
        withCredentials: true
      });
      setUser(null);
      // Redirect to the correct base path for GitHub Pages
      window.location.href = '/seosiri-monitor/login'; 
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);