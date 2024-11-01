// controllers/sequelize.js
require('dotenv').config();

const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    host: process.env.DB_LOCATION,
    dialect: 'postgres',
    logging: false,
});

sequelize.authenticate()
    .then(() => console.log('DB connected successfully'))
    .catch(err => console.error('Unable to connect to the PostgreSQL database:', err));

sequelize.sync()
    .then(() => console.log("Database & tables created!"))
    .catch(error => console.log("Error creating tables:", error));

module.exports = sequelize;
