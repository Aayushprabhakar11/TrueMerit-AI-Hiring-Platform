import { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (token) => {
    try {
      const res = await axios.get('http://localhost:5000/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(res.data);
      return res.data;
    } catch (error) {
      localStorage.removeItem('token');
      return null;
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        await fetchUserProfile(token);
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (email, password, role) => {
    const res = await axios.post('http://localhost:5000/api/auth/login', { email, password, role });
    localStorage.setItem('token', res.data.token);
    const fullUser = await fetchUserProfile(res.data.token);
    return fullUser || res.data;
  };

  const register = async (name, email, password, role, githubUsername, verificationCode) => {
    const res = await axios.post('http://localhost:5000/api/auth/register', {
      name,
      email,
      password,
      role,
      githubUsername,
      verificationCode,
    });
    localStorage.setItem('token', res.data.token);
    const fullUser = await fetchUserProfile(res.data.token);
    return fullUser || res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
