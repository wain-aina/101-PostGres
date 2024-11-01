const express = require('express');
const { Strategy: LocalStrategy } = require("passport-local");
const bcrypt = require('bcryptjs');
const passport = require('passport');

const router = express.Router();

// Import the Sequelize User model
const User = require('../models/user');

// Configure Passport LocalStrategy with Sequelize
passport.use(
  new LocalStrategy(async function verify(username, password, cb) {
    try {
      const user = await User.findOne({ where: { username } });
      
      if (user) {
        const storedHashedPassword = user.password;
        bcrypt.compare(password, storedHashedPassword, (err, valid) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return cb(err);
          } 
          if (valid) {
            return cb(null, user);
          } else {
            return cb(null, false, { message: 'Incorrect password' });
          }
        });
      } else {
        return cb(null, false, { message: 'User does not exist. Create an account to proceed.' });
      }
    } catch (err) {
      console.error("Error finding user:", err);
      return cb(err);
    }
  })
);

// Serialize user by ID
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user by ID with Sequelize
passport.deserializeUser(async function (id, done) {
  try {
    const user = await User.findByPk(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

module.exports = router;
