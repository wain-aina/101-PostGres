const Sequelize = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_LOCATION,
    dialect: 'postgres',
    logging: false,
});

const User = sequelize.define('User', {
    username: { type: Sequelize.STRING, unique: true, allowNull: false },
    identifier: Sequelize.STRING,
    password: Sequelize.STRING,
    resetPasswordToken: Sequelize.STRING,
    resetPasswordExpires: Sequelize.DATE,
    isVerified: { type: Sequelize.BOOLEAN, defaultValue: false }
  });
  
  module.exportsd = User;