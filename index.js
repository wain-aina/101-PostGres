// NPM PACKAGES
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const passport = require("passport");
const session = require("express-session");
const cookieParser = require('cookie-parser');
const async = require('async');
const crypto = require('crypto');
const { Strategy: LocalStrategy } = require("passport-local");
const bcrypt = require('bcryptjs');
const flash = require('connect-flash');
const pg = require('pg');
const Sequelize = require('sequelize');
const pgSession = require('connect-pg-simple')(session);

// INITIALIZE EXPRESS
const app = express();

// PORT
const PORT = 3000;

// SALT ROUNDS
const saltRounds = 10;

//PASSPORT CONTROLLER
const auth = require('./controllers/passport.js')

// NODEMAILER CONTROLLER
const transporter = require('./controllers/nodemailer.js');

// Initialize PostgreSQL connection with Sequelize
const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_LOCATION,
    dialect: 'postgres',
    logging: false,
});

// Check PostgreSQL connection
sequelize.authenticate().then(() => {
    console.log('DB connected successfully');
}).catch(err => {
    console.error('Unable to connect to the PostgreSQL database:', err);
});

// Define the User model
const User = sequelize.define('User', {
    username: { type: Sequelize.STRING, unique: true, allowNull: false },
    identifier: Sequelize.STRING,
    password: Sequelize.STRING,
    resetPasswordToken: Sequelize.STRING,
    resetPasswordExpires: Sequelize.DATE,
    isVerified: { type: Sequelize.BOOLEAN, defaultValue: false }
});

// Sync models with the database
sequelize.sync().then(() => {
    console.log("Database & tables created!");
}).catch((error) => console.log("Error creating tables:", error));

// Initialize other NPM packages
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public'));
app.use(session({
    secret: 'userisinthebuilding',
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
            port: process.env.PGPORT,
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

// Logic and Routes

app.get('/', (req, res) => res.render('site/index'));

app.get('/about', (req,res) => {
    res.render('site/about')
})

app.get('/service', (req,res) => {
    res.render('site/service')
})

app.get('/team', (req,res) => {
    res.render('site/team')
})

app.get('/why', (req,res) => {
    res.render('site/why')
})

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

// Register Route
app.get('/register', async (req, res) => {
    res.render('register', { title: "Register" });
});

app.post("/register", async function (req, res) {
    const { username, identifier, password } = req.body;
    try {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            req.flash('error', 'Email Account Already Exists');
            res.redirect('/register');
        } else {
            const hash = await bcrypt.hash(password, saltRounds);
            let user = await User.create({ username, identifier, password: hash });
            req.login(user, (err) => {
                if (err) { return next(err); }
                req.flash("error", "Please finish setting up your KYC for effective service");
                res.redirect('/home');
            });
        }
    } catch (err) {
        console.log(err);
        req.flash('error', 'Error creating account');
        res.redirect('/register');
    }
});

// Login Route
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

// Logout Route
app.post('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.flash('success', "See you next time.");
        res.redirect('/login');
    });
});

// Forgot Password Route
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

app.post('/forgot', async (req, res, next) => {
    try {
        const token = (await crypto.randomBytes(20)).toString('hex');
        const user = await User.findOne({ where: { username: req.body.forgot } });
        if (!user) {
            req.flash('error', "Account doesn't exist. Try Again");
            return res.redirect("/forgot");
        }
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();
        // Send reset email using your transporter logic here

        const reset_url = `http://${req.headers.host}/reset/${token}`;
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: user.username,
            subject: "RESET YOUR PASSWORD.",
            text: `Your request for a password reset has been received.\n\n` +
                `If you requested to change your password, please click on the following link within one hour-\n\n${reset_url}\n\n` +
                `If you did not seek to change your password, you can ignore this email.`
        };
        

        await transporter.sendMail(mailOptions);

        req.flash('success', "A link has been sent to your email with a reset token.");
        return res.redirect('/forgot')

    } catch (err) {
        req.flash('error', 'An error has occurred. Please try again');
        next(err);
    }
});

// Reset Password Route
app.get('/reset/:token', async (req, res) => {
    const user = await User.findOne({
        where: { resetPasswordToken: req.params.token, resetPasswordExpires: { [Sequelize.Op.gt]: Date.now() } }
    });
    if (!user) {
        req.flash('error', 'Password reset token is invalid or has expired.');
        return res.redirect('/login');
    }
    res.render('reset', { user: req.user, token: req.params.token, alerts: req.flash(), title: 'Reset Password' });
});

app.post('/reset/:token', async (req, res) => {
    const user = await User.findOne({
        where: { resetPasswordToken: req.params.token, resetPasswordExpires: { [Sequelize.Op.gt]: Date.now() } }
    });
    try{

        if (!user) {
            req.flash('error', 'Token is invalid or has expired');
            return res.redirect('/forgot');
        }
        if (req.body.newPassword === req.body.confirm) {
            const newHash = await bcrypt.hash(req.body.newPassword, saltRounds);
            user.password = newHash;
            user.resetPasswordToken = null;
            user.resetPasswordExpires = null;
            await user.save();
            req.login(user, (err) => {
                if (err) { return next(err); }
                req.flash('success', 'Your Password has been changed successfully');
                res.redirect('/home');
            });
            try {
                const successMail = {
                    to: user.username,
                    from: process.env.AUTH_EMAIL,
                    subject: "YOUR PASSWORD HAS BEEN CHANGED",
                    text: 'Hello,\n\n' +
                        'This is a confirmation that the password for your account ' + user.username + ' has just been changed.\n'
                };
                await transporter.sendMail(successMail);
            } catch (mailError) {
                console.error('Error sending email:', mailError);
            }
        } else {
            req.flash('error', "Passwords don't match. Try Again");
            res.redirect(`/reset/${req.params.token}`);
        }
        
    } catch(err){
        req.flash('error', 'An error occurred. Please try again later.');
        return res.redirect('/login');
    }
});

app.listen(PORT, () => console.log(`Server started on ${PORT}`));
