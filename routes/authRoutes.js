// routes/authRoutes.js
const express = require("express");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Sequelize = require("sequelize");

const router = express.Router();
const saltRounds = 10;

//USER MODEL
const User = require("../models/user");

//PASSPORT CONTROLLER
const passport = require("../controllers/passport");

//NODEMAILER CONTROLLER
const transporter = require("../controllers/nodemailer");

// REGISTER
router.post("/register", async (req, res) => {
    const { username, identifier, password } = req.body;
    try {
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            req.flash("error", "Email Account Already Exists");
            return res.redirect("/register");
        }

        const hash = await bcrypt.hash(password, saltRounds);
        let user = await User.create({ username, identifier, password: hash });

        req.login(user, err => {
            if (err) return next(err);
            req.flash("success", "Please finish setting up your KYC for effective service");
            return res.redirect("/home");
        });
    } catch (err) {
        console.log(err);
        req.flash("error", "Error creating account");
        res.redirect("/register");
    }
});

// FORGOT
router.post("/forgot", async (req, res) => {
    const token = crypto.randomBytes(20).toString("hex");
    try {
        const user = await User.findOne({ where: { username: req.body.forgot } });
        if (!user) {
            req.flash("error", "Account doesn't exist. Try Again");
            return res.redirect("/forgot");
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const reset_url = `http://${req.headers.host}/reset/${token}`;
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: user.username,
            subject: "RESET YOUR PASSWORD.",
            text: `To reset your password, please click the following link:\n\n${reset_url}`,
        };

        await transporter.sendMail(mailOptions);
        req.flash("success", "A link has been sent to your email with a reset token.");
        res.redirect("/forgot");
    } catch (err) {
        req.flash("error", "An error has occurred. Please try again");
        res.redirect("/forgot");
    }
});

//RESET 
router.post('/reset/:token', async (req, res) => {
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

module.exports = router;
