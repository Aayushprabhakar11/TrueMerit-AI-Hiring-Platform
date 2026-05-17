const axios = require('axios');
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { fetchGithubData } = require('../services/githubService');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { name, email, password, role, githubUsername, verificationCode } = req.body;

    // Validation
    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide all required fields: name, email, password, role' });
    }

    if (role === 'student' && !githubUsername) {
      return res.status(400).json({ message: 'GitHub username is required for student registration' });
    }

    if (role === 'student' && !verificationCode) {
      return res.status(400).json({ message: 'Student verification code is required for student registration' });
    }

    if (role === 'student') {
      const validCodes = [
        process.env.STUDENT_VERIFICATION_CODE || 'TRUEMERIT',
        'TESTSTUDENT',
        'TRUEMERIT123'
      ].filter(Boolean);

      if (!validCodes.includes(verificationCode.trim())) {
        return res.status(400).json({ message: 'Invalid student verification code. Please use the correct access code.' });
      }
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({ message: 'Email already registered. Please use a different email or login.' });
    }

    const user = await User.create({
      name,
      email,
      password,
      role,
      githubUsername: role === 'student' ? githubUsername : undefined
    });

    if (user && role === 'student' && githubUsername) {
      // Async fetch to prevent blocking registration response
      fetchGithubData(githubUsername).then(async (ghData) => {
        if (ghData) {
          user.githubData = ghData;
          await user.save();
          const { invalidateCacheByPrefix } = require('../services/cacheService');
          invalidateCacheByPrefix('students:');
        }
      }).catch(console.error);
    }

    if (user) {
      console.log(`✓ New user registered: ${user.email} (${user.role})`);
      res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400).json({ message: 'Failed to create user account' });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Registration failed. Please try again.' });
  }
};

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
const authUser = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const user = await User.findOne({ email });

    if (user && user.role !== role) {
      return res.status(401).json({ message: `Access denied: You are registered as a ${user.role}, not a ${role}.` });
    }

    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      res.json(user);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const githubAuth = async (req, res) => {
  try {
    const role = req.query.role === 'recruiter' ? 'recruiter' : 'student';
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;
    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';

    if (!clientId || !clientSecret) {
      return res.redirect(`${frontendUrl}/login/student?oauthError=${encodeURIComponent('GitHub OAuth is not configured on the server. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env.')}`);
    }

    const state = Buffer.from(JSON.stringify({ role })).toString('base64');
    const githubUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=read:user user:email&state=${encodeURIComponent(state)}`;
    return res.redirect(githubUrl);
  } catch (error) {
    console.error('GitHub auth redirect error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    return res.redirect(`${frontendUrl}/login/student?oauthError=${encodeURIComponent('Failed to start GitHub OAuth. Please try again later.')}`);
  }
};

const githubConfig = async (req, res) => {
  const enabled = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
  return res.json({
    enabled,
    message: enabled ? 'GitHub OAuth enabled' : 'GitHub OAuth is not configured. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in backend/.env',
  });
};

const githubCallback = async (req, res) => {
  try {
    const { code, state: encodedState } = req.query;
    if (!code) {
      return res.status(400).json({ message: 'GitHub authorization code is missing.' });
    }

    const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`;
    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        state: encodedState,
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenRes.data?.access_token;
    if (!accessToken) {
      return res.status(500).json({ message: 'Failed to obtain GitHub access token.' });
    }

    const authHeaders = {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
    };

    const profileRes = await axios.get('https://api.github.com/user', { headers: authHeaders });
    const emailsRes = await axios.get('https://api.github.com/user/emails', { headers: authHeaders });

    const githubProfile = profileRes.data;
    const emails = Array.isArray(emailsRes.data) ? emailsRes.data : [];
    const primaryEmail = emails.find((item) => item.primary && item.verified)?.email
      || emails.find((item) => item.verified)?.email
      || githubProfile.email;

    if (!primaryEmail) {
      return res.status(400).json({ message: 'Your GitHub account does not expose a verified email address.' });
    }

    let role = 'student';
    if (encodedState) {
      try {
        const state = JSON.parse(Buffer.from(encodedState, 'base64').toString('utf8'));
        if (state.role === 'recruiter') role = 'recruiter';
      } catch (error) {
        console.warn('Invalid GitHub OAuth state:', error);
      }
    }

    let user = await User.findOne({ email: primaryEmail });
    if (user) {
      if (user.role !== role) {
        return res.status(400).json({ message: `You are registered as a ${user.role}. Please login from the correct role or use email login.` });
      }
    } else {
      const randomPassword = crypto.randomBytes(16).toString('hex');
      const userData = {
        name: githubProfile.name || githubProfile.login || primaryEmail.split('@')[0],
        email: primaryEmail,
        password: randomPassword,
        role,
        githubUsername: githubProfile.login,
      };

      if (role === 'student') {
        const ghData = await fetchGithubData(githubProfile.login);
        if (ghData) {
          userData.githubData = ghData;
        }
      }

      user = await User.create(userData);
    }

    const token = generateToken(user._id);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    return res.redirect(`${frontendUrl}/oauth-success?token=${token}`);
  } catch (error) {
    console.error('GitHub OAuth callback error:', error.response?.data || error.message || error);
    res.status(500).json({ message: 'GitHub OAuth sign-in failed. Please try again.' });
  }
};

module.exports = { registerUser, authUser, getUserProfile, githubAuth, githubCallback, githubConfig };
