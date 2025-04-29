const express = require('express');
const axios = require('axios');
const path = require('path');
const dotenv = require('dotenv');
const { URLSearchParams } = require('url');
const cors = require('cors');
const connectDB = require('./db');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');

dotenv.config();
connectDB();
const app = express();
app.use(cookieParser());
// app.use(cors({ 
//   // origin: 'https://project3-angular.wl.r.appspot.com', 
//   // origin: 'http://localhost:4200',
// origin:true,
//   credentials: true }));
app.use(cors({
  origin: function (origin, callback) {
    // allow all origins OR no origin (iOS/React Native/mobile)
    if (!origin || typeof origin === 'undefined') {
      callback(null, true);
    } else {
      callback(null, true); // allow all for now
      // or add logic to restrict specific origins if needed
    }
  },
  credentials: true
}));


// app.use(cors());
app.use(express.json()); // Enables JSON request body parsing
app.use(express.urlencoded({ extended: true })); // Enables URL-encoded data parsing
app.use('/api/auth', authRoutes);

const port = process.env.PORT || 8080;

// Get Artsy API credentials from .env file
const C_ID = process.env.CLIENT_ID;
const C_SCRT = process.env.CLIENT_SECRET;
const JWT_SECRET = process.env.JWT_SECRET

global.artsyToken = null; 

const getArtsyToken = async () => {
  try {
    const response = await axios.post('https://api.artsy.net/api/tokens/xapp_token', new URLSearchParams({
      client_id: C_ID,
      client_secret: C_SCRT,
    }));
    return global.artsyToken=response.data.token;
  } catch (error) {
    console.error('Error fetching Artsy token:', error);
    return null;
  }
};
getArtsyToken();

app.get('/search/:artist_name', async (req, res) => {
getArtsyToken();
  const artistName = req.params.artist_name;
  const token = global.artsyToken;

  if (!token) {
    return res.status(500).json({ error: 'Failed to authenticate with Artsy API' });
  }

  try {
    const headers = { 'X-XAPP-Token': token };
    const encodedArtistName = encodeURIComponent(artistName);
    const url = `https://api.artsy.net/api/search?q=${encodedArtistName}&size=10&type=artist`;

    const response = await axios.get(url, { headers });

    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching artist data:', error);
    return res.status(500).json({ error: 'Failed to fetch data from Artsy' });
  }
});

// // Get details of a specific artist
app.get('/artist/:artist_id', async (req, res) => {
  const artistId = req.params.artist_id;
  const token = global.artsyToken;

  if (!token) {
    return res.status(500).json({ error: 'Failed to authenticate with Artsy API' });
  }

  try {
    const headers = { 'X-XAPP-Token': token };
    const url = `https://api.artsy.net/api/artists/${artistId}`;

    const response = await axios.get(url, { headers });

    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching artist details:', error);
    return res.status(500).json({ error: 'Failed to fetch artist details from Artsy' });
  }
});

//Get artworks
app.get('/artworks/:artist_id', async (req, res) => {
  const artistId = req.params.artist_id;
  const token = global.artsyToken;

  if (!token) {
    return res.status(500).json({ error: 'Failed to authenticate with Artsy API' });
  }

  try {
    const headers = { 'X-XAPP-Token': token };
    const url = `https://api.artsy.net/api/artworks?artist_id=${artistId}`;

    const response = await axios.get(url, { headers });

    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching artist details:', error);
    return res.status(500).json({ error: 'Failed to fetch artwork details from Artsy' });
  }
});

//Get categories for artworks:
app.get('/genes/:artwork_id', async (req, res) => {
  const artworkId = req.params.artwork_id;
  const token = global.artsyToken;

  if (!token) {
    return res.status(500).json({ error: 'Failed to authenticate with Artsy API' });
  }

  try {
    const headers = { 'X-XAPP-Token': token };
    const url = `https://api.artsy.net/api/genes?artwork_id=${artworkId}`;

    const response = await axios.get(url, { headers });

    return res.json(response.data);
  } catch (error) {
    console.error('Error fetching artist details:', error);
    return res.status(500).json({ error: 'Failed to fetch artwork details from Artsy' });
  }
});



app.listen(port,'0.0.0.0', () => {
  console.log(`Server running at ${process.env.BACKEND_URL || 'http://localhost:' + port}`);
});