import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, BrainCircuit } from 'lucide-react';
import { motion } from 'framer-motion';

const StudentLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [githubEnabled, setGithubEnabled] = useState(true);
  const [searchParams] = useSearchParams();
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (user && user.role === 'student') {
      navigate('/student-dashboard');
    }
  }, [user, navigate]);

  useEffect(() => {
    const oauthError = searchParams.get('oauthError');
    if (oauthError) {
      setError(oauthError);
    }

    const fetchGithubConfig = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/github/config');
        setGithubEnabled(res.data.enabled);
      } catch (err) {
        setGithubEnabled(false);
      }
    };
    fetchGithubConfig();
  }, [searchParams]);

  const handleGitHubLogin = () => {
    if (!githubEnabled) {
      setError('GitHub OAuth is not configured on the server. Use email and password login instead.');
      return;
    }
    window.location.href = 'http://localhost:5000/api/auth/github?role=student';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      await login(email, password, 'student');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex bg-[#0A0D14] text-textLight relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-1/4 -left-[20%] w-[50%] h-[50%] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md m-auto bg-[#1C212B]/80 backdrop-blur-3xl border border-blue-500/20 p-8 sm:p-10 rounded-3xl shadow-[0_0_40px_rgba(59,130,246,0.1)] relative z-10">
        
        <div className="flex flex-col items-center mb-8">
           <div className="w-12 h-12 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-center justify-center mb-4">
             <BrainCircuit size={24} className="text-blue-500"/>
           </div>
           <h2 className="text-2xl font-black text-white tracking-tight">Candidate Login</h2>
           <p className="text-gray-400 text-sm mt-1">Access your algorithmically ranked profile</p>
        </div>
        
        {error && (
          <motion.div initial={{opacity:0, height:0}} animate={{opacity:1, height:'auto'}} className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-6 flex items-center gap-3 text-sm font-medium">
            <AlertCircle size={18} className="shrink-0" /> {error}
          </motion.div>
        )}

        <div className="mb-6">
          <button type="button" onClick={handleGitHubLogin} disabled={!githubEnabled} className="w-full bg-[#0A0D14] hover:bg-[#151921] text-white border border-gray-700/50 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-3 shadow-sm group disabled:opacity-50 disabled:cursor-not-allowed">
            <span className="font-mono font-black text-lg -mt-0.5 text-gray-400 group-hover:text-white transition">@</span> Continue with GitHub
          </button>
        </div>

        <div className="flex items-center gap-4 mb-6">
           <div className="flex-1 h-px bg-gray-800"></div>
           <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Or Email</div>
           <div className="flex-1 h-px bg-gray-800"></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative group">
            <input 
              type="email" id="email" required placeholder=" "
              className="peer w-full bg-[#1C212B] border border-gray-700/50 rounded-xl px-4 pt-6 pb-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm"
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
            <label htmlFor="email" className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-blue-400 peer-valid:top-1.5 peer-valid:text-[10px] peer-valid:font-semibold peer-valid:text-gray-400">
              Email Address
            </label>
          </div>
          
          <div className="relative group">
            <input 
              type="password" id="password" required placeholder=" "
              className="peer w-full bg-[#1C212B] border border-gray-700/50 rounded-xl px-4 pt-6 pb-2 text-white focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all font-medium text-sm"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <label htmlFor="password" className="absolute left-4 top-4 text-gray-500 text-sm transition-all pointer-events-none peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-semibold peer-focus:text-blue-400 peer-valid:top-1.5 peer-valid:text-[10px] peer-valid:font-semibold peer-valid:text-gray-400">
              Password
            </label>
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)] mt-6 flex justify-center items-center gap-2 group active:scale-[0.98]"
          >
            Sign In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <p className="text-center text-gray-400 mt-8 text-sm">
          Are you a recruiter? <Link to="/login/recruiter" className="text-purple-400 hover:text-purple-300 font-bold">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default StudentLogin;
