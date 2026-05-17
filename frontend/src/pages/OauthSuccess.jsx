import { useEffect, useContext, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';

const OauthSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setUser } = useContext(AuthContext);
  const [message, setMessage] = useState('Completing GitHub sign-in...');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      navigate('/login/student');
      return;
    }

    const finishLogin = async () => {
      try {
        localStorage.setItem('token', token);
        const res = await axios.get('http://localhost:5000/api/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });

        setUser(res.data);
        navigate(res.data.role === 'recruiter' ? '/recruiter-dashboard' : '/student-dashboard');
      } catch (error) {
        setMessage('GitHub login failed. Redirecting to login...');
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login/student'), 2000);
      }
    };

    finishLogin();
  }, [navigate, searchParams, setUser]);

  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center bg-[#0A0D14] text-white px-4">
      <div className="max-w-lg text-center rounded-3xl border border-white/10 bg-[#111827]/90 p-10 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
        <h1 className="text-2xl font-bold mb-4">Signing in with GitHub</h1>
        <p className="text-sm text-gray-300">{message}</p>
      </div>
    </div>
  );
};

export default OauthSuccess;
