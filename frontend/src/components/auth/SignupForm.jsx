import { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../../context/AuthContext';
import { AlertCircle, ArrowRight, Check, X, Eye, EyeOff, Briefcase, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import GitHubPreviewCard from './GitHubPreviewCard';

const FloatingInput = ({ id, type = 'text', label, value, onChange, required, borderClass = '', rightEl, extraLabel }) => (
  <div className="relative group">
    <input
      type={type} id={id} required={required} placeholder=" "
      className={`peer w-full bg-[#0E1117] border rounded-xl px-4 pt-[22px] pb-[10px] text-white
        focus:outline-none focus:ring-1 transition-all font-medium text-sm
        placeholder-transparent
        ${borderClass || 'border-[#30363D] focus:border-blue-500/60 focus:ring-blue-500/30'}
      `}
      value={value} onChange={onChange}
      autoComplete="off"
    />
    <label
      htmlFor={id}
      className="absolute left-4 text-gray-500 pointer-events-none transition-all duration-200
        top-3.5 text-sm
        peer-placeholder-shown:top-3.5 peer-placeholder-shown:text-sm
        peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:font-bold peer-focus:text-blue-400
        peer-valid:top-1.5 peer-valid:text-[10px] peer-valid:font-bold peer-valid:text-gray-500
      "
    >
      {label}
      {extraLabel && <span className="text-blue-400 ml-1">{extraLabel}</span>}
    </label>
    {rightEl && (
      <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
    )}
  </div>
);

const getPasswordStrength = (pwd) => {
  if (!pwd) return 0;
  let score = 0;
  if (pwd.length >= 8) score++;
  if (pwd.length >= 12) score++;
  if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  return Math.min(score, 3);
};

const STRENGTH_CONFIG = [
  { label: 'Weak',   color: 'bg-red-500' },
  { label: 'Fair',   color: 'bg-yellow-500' },
  { label: 'Good',   color: 'bg-blue-500' },
  { label: 'Strong', color: 'bg-green-500' },
];

const SignupForm = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', role: 'student', githubUsername: '', verificationCode: ''
  });
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [githubEnabled, setGithubEnabled] = useState(true);
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();

  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  const pwdStrength = getPasswordStrength(formData.password);
  const pwdConfig = STRENGTH_CONFIG[pwdStrength - 1] || null;

  const set = (key) => (e) => setFormData(prev => ({ ...prev, [key]: e.target.value }));

  useEffect(() => {
    const fetchGithubConfig = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/auth/github/config');
        setGithubEnabled(res.data.enabled);
      } catch (err) {
        setGithubEnabled(false);
      }
    };
    fetchGithubConfig();
  }, []);

  const handleGitHubAuth = () => {
    if (!githubEnabled) {
      setError('GitHub OAuth is not configured on the server. Please use email registration or ask the admin to configure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET.');
      return;
    }
    const role = formData.role || 'student';
    window.location.href = `http://localhost:5000/api/auth/github?role=${role}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.role === 'student' && !formData.githubUsername) {
      setError('GitHub username is required for student verification.');
      return;
    }
    if (formData.role === 'student' && !formData.verificationCode.trim()) {
      setError('A valid student verification code is required to register as a student.');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const userData = await register(
        formData.name,
        formData.email,
        formData.password,
        formData.role,
        formData.githubUsername,
        formData.verificationCode.trim()
      );
      if (userData.role === 'student') navigate('/student-dashboard');
      else navigate('/recruiter-dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full lg:w-[52%] flex flex-col justify-center items-center px-5 py-12 sm:px-10 lg:px-14 xl:px-20 min-h-[calc(100vh-80px)] bg-[#0A0D14] relative overflow-hidden">

      {/* Subtle right-side glow */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[40%] h-[60%] bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] relative z-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-black text-white tracking-tight mb-1.5">Create an account</h2>
          <p className="text-gray-500 text-sm">
            Already have one?{' '}
            <Link to="/login/student" className="text-blue-400 hover:text-blue-300 font-semibold transition">
              Sign in
            </Link>
          </p>
        </motion.div>

        {/* GitHub OAuth Button */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6">
          <button
            type="button"
            onClick={handleGitHubAuth}
            disabled={!githubEnabled}
            className="w-full group bg-[#0D1117] hover:bg-[#161B22] border border-[#30363D] hover:border-[#8B949E]/60 text-white py-3.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-white fill-current" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="flex-1 h-px bg-[#21262D]" />
          <span className="text-[11px] font-bold text-gray-600 uppercase tracking-[0.15em]">Or with email</span>
          <div className="flex-1 h-px bg-[#21262D]" />
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="bg-red-500/8 border border-red-500/25 text-red-400 px-4 py-3 rounded-xl flex items-start gap-3 text-sm"
            >
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* Role Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#0E1117] rounded-xl border border-[#21262D]">
            {[
              { value: 'student', label: 'Candidate', icon: <GraduationCap size={14} /> },
              { value: 'recruiter', label: 'Recruiter', icon: <Briefcase size={14} /> }
            ].map(({ value, label, icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, role: value }))}
                className={`flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${
                  formData.role === value
                    ? value === 'student'
                      ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300 shadow-sm'
                      : 'bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 border border-transparent'
                }`}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Full Name */}
          <FloatingInput
            id="name" label="Full Name" value={formData.name} onChange={set('name')} required
            rightEl={
              formData.name.length > 1
                ? <Check size={14} className="text-green-400" />
                : null
            }
          />

          {/* Email */}
          <FloatingInput
            id="email" type="email" label="Email Address" value={formData.email} onChange={set('email')} required
            rightEl={
              formData.email.length > 0
                ? isEmailValid
                  ? <Check size={14} className="text-green-400" />
                  : <X size={14} className="text-red-400/60" />
                : null
            }
          />

          {/* Verification Code — student only */}
          <AnimatePresence>
            {formData.role === 'student' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-2">
                  <FloatingInput
                    id="verificationCode"
                    label="Student Verification Code"
                    value={formData.verificationCode}
                    onChange={set('verificationCode')}
                    required
                    rightEl={
                      formData.verificationCode.length > 0
                        ? <Check size={14} className="text-blue-400" />
                        : null
                    }
                  />
                  <p className="text-xs text-gray-500 mt-2">Enter the student access code provided by TrueMerit to register.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* GitHub Username — student only */}
          <AnimatePresence>
            {formData.role === 'student' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mb-1">
                  <FloatingInput
                    id="github"
                    label="GitHub Username"
                    extraLabel="★ Required"
                    value={formData.githubUsername}
                    onChange={set('githubUsername')}
                    required
                    borderClass="border-blue-500/30 focus:border-blue-500 focus:ring-blue-500/30"
                    rightEl={
                      formData.githubUsername.length > 0
                        ? <Check size={14} className="text-blue-400" />
                        : null
                    }
                  />
                </div>

                {/* Live GitHub Preview */}
                <AnimatePresence>
                  {formData.githubUsername.length >= 2 && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.4 }}
                      className="mt-2"
                    >
                      <GitHubPreviewCard username={formData.githubUsername} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Password */}
          <div>
            <FloatingInput
              id="password"
              type={showPwd ? 'text' : 'password'}
              label="Password"
              value={formData.password}
              onChange={set('password')}
              required
              rightEl={
                <button type="button" onClick={() => setShowPwd(s => !s)} className="text-gray-500 hover:text-gray-300 transition">
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            {/* Strength Bar */}
            {formData.password.length > 0 && (
              <div className="mt-2 px-0.5">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        pwdStrength >= i && pwdConfig ? pwdConfig.color : 'bg-[#21262D]'
                      }`}
                    />
                  ))}
                </div>
                {pwdConfig && (
                  <p className={`text-[10px] font-bold ${
                    pwdStrength === 1 ? 'text-red-400' :
                    pwdStrength === 2 ? 'text-yellow-400' :
                    pwdStrength === 3 ? 'text-blue-400' : 'text-green-400'
                  }`}>
                    {pwdConfig.label} password
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Submit */}
          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
              text-white font-bold py-4 rounded-xl transition-all mt-2
              shadow-[0_0_25px_rgba(59,130,246,0.25)] hover:shadow-[0_0_35px_rgba(59,130,246,0.45)]
              flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <>
                Create Account
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </motion.button>
        </motion.form>

        {/* Trust */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="mt-10 flex flex-col items-center gap-2"
        >
          <div className="flex -space-x-2">
            {[1, 2, 3, 4].map(i => (
              <img
                key={i}
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=trust${i}`}
                alt="avatar"
                className="w-6 h-6 rounded-full border-2 border-[#0A0D14] bg-gray-800"
              />
            ))}
          </div>
          <p className="text-[11px] text-gray-600 text-center">
            Trusted by <span className="text-gray-400 font-bold">1,000+</span> students · Used by recruiters from top tech companies
          </p>
        </motion.div>

      </div>
    </div>
  );
};

export default SignupForm;
