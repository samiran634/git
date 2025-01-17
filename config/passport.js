const passport = require('passport');
const CookieStrategy = require('passport-cookie');
const jwt = require('jsonwebtoken');

// Secret for JWT verification
const JWT_SECRET = 'sam_chalk';

// Define Cookie Strategy
passport.use(
  new CookieStrategy({
    cookieName: 'token'
  }, (token, done) => {
    try {
      if (!token) {
        return done(null, false);
      }
      const user = jwt.verify(token, JWT_SECRET);
      return done(null, user);
    } catch (err) {
      console.error('JWT Verification failed:', err);
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
