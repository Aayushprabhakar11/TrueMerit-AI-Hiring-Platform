const express = require('express');
const router = express.Router();
const { registerUser, authUser, getUserProfile, githubAuth, githubCallback, githubConfig } = require('../controllers/authController');
const { protect } = require('../middlewares/authMiddleware');

router.get('/github', githubAuth);
router.get('/github/config', githubConfig);
router.get('/github/callback', githubCallback);
router.post('/register', registerUser);
router.post('/login', authUser);
router.get('/profile', protect, getUserProfile);

module.exports = router;
