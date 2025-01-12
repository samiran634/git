const passport = require('../node_modules/passport');
const CookieStrategy = require('../node_modules/passport-cookie');
const jwt = require('../node_modules/jsonwebtoken');

// Secret for JWT verification
const JWT_SECRET = 'sam_chalk';

// Define Cookie Strategy
passport.use(
  new CookieStrategy((token, done) => {
    try {
      // Verify JWT from the cookie
      const user = jwt.verify(token, JWT_SECRET);
      return done(null, user); // Attach user to request
    } catch (err) {
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
