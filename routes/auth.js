const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/Users');
const authenticateToken = require('../middleware/authMiddleware')
const cors = require('cors');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET ; // Ensure a secret exists
const COOKIE_EXPIRATION = 3600000; // 1 hour in milliseconds
const axios = require('axios');


// router.use(cors({
//   // origin: 'https://project3-angular.wl.r.appspot.com',
//   // origin: 'http://localhost:4200',
//   origin: true,
//   credentials: true
// }));
router.use(cors({
  origin: function (origin, callback) {
    // allow all origins OR no origin (iOS/React Native/mobile)
    if (!origin || typeof origin === 'undefined') {
      callback(null, true);
    } else {
      callback(null, true); // allow all for now
    }
  },
  credentials: true
}));



  
  router.post('/login', async (req, res) => {

    try {
      const { email, password } = req.body;
  
      console.log("Login attempt:", email, password); // Debugging
  
      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Incorrect password' });
      }
  
      const token = jwt.sign(
        { userId: user._id, email: user.email, name: user.name },  // Ensure user data is included
        JWT_SECRET,
        { expiresIn: '1h' }
    );
      res.cookie('auth_token', token, {
              httpOnly: true,
              secure: false, // Use `false` if not using HTTPS locally
              sameSite: 'lax',
              maxAge: COOKIE_EXPIRATION // 1 hour
        });
      res.json({ success: true, token, user: { 
        id: user._id,
        name: user.name,
        email: user.email,
        profileImageUrl: user.profileImageUrl || 'assets/default-profile.png',
        favorites: user.favorites || []
    } });
  
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  router.post('/logout', (req, res) => {
    res.clearCookie('auth_token', { httpOnly: true, secure: true, sameSite: 'Strict' });
    res.status(200).send({ message: 'Logged out successfully' });
  });
  

router.get('/me', async (req, res) => {
  const token = req.cookies.auth_token;
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      profileImageUrl: user.profileImageUrl,
      favorites: user.favorites
    });
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token" });
  }
});


router.get('/favorites', authenticateToken, async (req, res) => {
  try {
      const user = await User.findById(req.user.id);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }
      res.json(user.favorites || []); 
  } catch (err) {
      res.status(500).json({ message: "Server error" });
  }
});


router.post('/favorites', authenticateToken, async (req, res) => {
  console.log("✅ Authenticated user from token:", req.user);

  try {
      const user = await User.findById(req.user.userId);
      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      const { artistId } = req.body;
      if (!artistId) {
          return res.status(400).json({ message: "Artist ID is required" });
      }

      const existingIndex = user.favorites.findIndex(fav => fav.artistId === artistId);

      if (existingIndex !== -1) {
          user.favorites.splice(existingIndex, 1);
      } else {
          user.favorites.push({ artistId, timestamp: new Date() });
      }

      await user.save();
      res.json(user.favorites);
  } catch (err) {
      res.status(500).json({ message: "Server error" });
  }
});

router.delete("/favorites/:id", authenticateToken, async (req, res) => {
  try {
      const userId = req.user.id; 
      const favoriteId = req.params.id; 

      const user = await User.findById(userId);

      if (!user) {
          return res.status(404).json({ message: "User not found" });
      }

      if (!Array.isArray(user.favorites)) {
          user.favorites = []; // Initialize it if undefined or null
      }

      user.favorites = user.favorites.filter(fav => fav.artistId !== favoriteId);

      await user.save();

      res.json({ message: "Favorite removed successfully", user });
  } catch (error) {
      console.error("Error deleting favorite:", error);
      res.status(500).json({ message: "Server error" });
  }
});

router.get('/similar-artists/:artistId', authenticateToken, async (req, res) => {
  try {
    if (!req.user) {
      console.log('User not authenticated');
      return res.status(401).json({ message: 'User not authenticated' });
    }

    console.log('User:', req.user); // Debugging

    const artsyToken = global.artsyToken; // Ensure Artsy token is generated


    if (!artsyToken) {
      console.error('Failed to fetch Artsy token');
      return res.status(500).json({ message: 'Failed to obtain Artsy token' });
    }

    console.log('Artsy Token:', artsyToken); // Debugging

    const artistId = req.params.artistId;
    console.log(`Fetching similar artists for ID: ${artistId}`);

    const response = await axios.get(`https://api.artsy.net/api/artists?similar_to_artist_id=${artistId}`, {
      headers: { 'X-Xapp-Token': artsyToken },
    });

   
    res.json(response.data._embedded.artists);
  } catch (error) {
    console.error('Error fetching similar artists:', error.response ? error.response.data : error);
    res.status(500).json({ message: 'Internal server error', error: error.response ? error.response.data : error.message });
  }
});




router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const newUser = new User({ name, email, password }); 
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, JWT_SECRET, { expiresIn: '1h' });


    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: true, // 
      sameSite: 'None',
      maxAge: COOKIE_EXPIRATION // 1 hour
});

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        profileImageUrl: newUser.profileImageUrl
      }
    });
  } catch (error) {
    console.error('Error registering user:', error);-
    res.status(500).json({ message: 'Server error' });
  }
});


router.delete('/delete-account', authenticateToken, async (req, res) => {
  try {
      const userId = req.user.userId;
              const deletedUser = await User.findByIdAndDelete(userId);
              if (!deletedUser) {
                  return res.status(404).json({ message: "User not found" });
              }
      
              res.clearCookie('auth_token', { httpOnly: true, secure: false, sameSite: 'lax' });
      
              res.json({ message: "User account deleted successfully" });
          } catch (error) {
              console.error("Error deleting user account:", error);
              res.status(500).json({ message: "Server error" });
          }
      });
      


  module.exports = router;