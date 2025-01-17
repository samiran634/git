const passport = require('passport');
const CookieStrategy = require('passport-cookie');
const jwt = require('jsonwebtoken');

// Secret for JWT verification
const JWT_SECRET = 'sam_chalk';

// Define Cookie Strategy
passport.use(
  new CookieStrategy({
    cookieName: 'token',
    signed: false,
    passReqToCallback: true
  }, async (req, token, done) => {
    try {
      if (!token) {
        console.log('No token found');
        return done(null, false);
      }
      
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('Decoded token:', decoded);
      
      return done(null, decoded);
    } catch (err) {
      console.error('Token verification failed:', err);
      return done(null, false);
    }
  })
);

// Optional: Serialize and Deserialize User for sessions
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  // Fetch user by ID if needed
  done(null, { id });
});

module.exports = passport;
