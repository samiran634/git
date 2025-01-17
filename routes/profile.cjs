const express = require('express');
const passport = require('passport');
const axios = require('axios');
const router = express.Router();

// Fetch quiz app profile route
router.get(
  '/profile',
  passport.authenticate('cookie', { session: false }),
  async (req, res) => {
    try {
      // Use JWT from cookie to call Quiz App API
      console.log("profile fetching is in progress");
      const token = req.cookies['jwt']; // Adjust the cookie name as needed
      const response = await axios.get('https://quize-app-qan3.onrender.com/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      res.json({ profile: response.data });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch profile' });
    }
  }
);

module.exports = router;
