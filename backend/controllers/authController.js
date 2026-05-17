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

module.exports = { registerUser, authUser, getUserProfile };
