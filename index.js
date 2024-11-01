// NPM PACKAGES
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const passport = require("passport");
const session = require("express-session");
const flash = require('connect-flash');
const pg = require('pg');
const pgSession = require('connect-pg-simple')(session);

// INITIALIZE EXPRESS
const app = express();

// PORT
const PORT = 3000;

//SEQULIZE CONTROLLER
const sequelize = require('./controllers/sequelize.js');

//PASSPORT CONTROLLER
const auth = require('./controllers/passport.js')

// AUTHENTICATION ROUTES
const authRoutes = require('./routes/authRoutes.js')

// SCHEMA
const User = require('./models/user.js');

// INITIALIZE NPM PACKAGES
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        maxAge: 1000 * 60 * 15,
    },
    store: new pgSession({
        pool: new pg.Pool({
            user: process.env.DB_USER,
            host: process.env.DB_LOCATION,
            database: process.env.DB_NAME,
            password: process.env.DB_PASS,
            port: process.env.DB_PORT,
            // ssl: {
            //     rejectUnauthorized: false,
            //     ca: fs.readFileSync('pg.pem')
            //   }
        }),
        createTableIfMissing: true,
        
    })
}));
app.use(passport.initialize());
app.use(passport.authenticate('session'));
app.use(flash());
app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    res.locals.user = req.user || null;
    next();
});

// INITIALIZING CONTROLLERS

app.use('/', auth);
app.use('/', authRoutes);

// LOGIC

app.get('/', (req, res) => res.render('site/index'));

app.get('/about', (req,res) => res.render('site/about'))

app.get('/service', (req,res) => res.render('site/service'))

app.get('/team', (req,res) => res.render('site/team'))

app.get('/why', (req,res) => res.render('site/why'))

//HOME

app.get('/home', async (req, res) => {
    if (req.isAuthenticated()) {
        try {
            const user = await User.findByPk(req.user.id);
            
            if (user) {
                res.render('home', {
                    title: 'Home',
                    state: user.isVerified,
                    alerts: req.flash()
                });
            } else {
                req.flash('error', 'User not found');
                res.redirect('/login');
            }
        } catch (err) {
            console.error('Error fetching user:', err);
            req.flash('error', 'An error occurred. Please try again.');
            res.redirect('/login');
        }
    } else {
        req.flash('error', 'Please Log In or Create An Account To Continue');
        res.redirect('/login');
    }
});

// LOGIN
app.get('/login', (req, res) => {
    res.render('login', {
        user: req.user,
        alerts: req.flash(),
        title: 'Login'
    });
});

app.post("/login", passport.authenticate("local", {
    failureRedirect: "/login",
}), (req, res) => {
    req.flash('success', "Welcome Back. Pick Up Where You Left Off");
    res.redirect("/home");
});

// REGISTER
app.get('/register', async (req, res) => res.render('register', { title: "Register" }));

// LOGOUT
app.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', "See you next time.");
        res.redirect('/login');
    });
});

// FORGOT
app.get('/forgot', (req, res)=>{
    if(req.isAuthenticated()){
        res.redirect("/home");
    } else {
        res.render("forgot", {
            user: req.user,
            token: req.params.token,
            alerts:req.flash(),
            title: 'Forgot Password'
        });
    }
});

// RESET
app.get('/reset/:token', async (req, res) => {
    const user = await User.findOne({
        where: { 
            resetPasswordToken: req.params.token, 
            resetPasswordExpires: { 
                [sequelize.Sequelize.Op.gt]: Date.now() 
            } 
        }
    });
    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/login');
    }
    res.render('reset', { 
        user: req.user, 
        token: req.params.token, 
        alerts: req.flash(), 
        title: 'Reset Password' 
    });
});

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
