const { DataTypes } = require('sequelize');
const sequelize = require('../controllers/sequelize')

const User = sequelize.define('User', {
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    identifier: DataTypes.STRING,
    password: DataTypes.STRING,
    resetPasswordToken: DataTypes.STRING,
    resetPasswordExpires: DataTypes.DATE,
    isVerified: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = User;

  