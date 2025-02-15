require('dotenv').config({ path: './.env' });

const config = {
  development: {
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    host: process.env.DB_HOST || "127.0.0.1",
    port: parseInt(process.env.DB_PORT ?? "5432"),
    dialect: "postgres"
  },
  production: {
    username: 'root',
    password: null,
    database: 'database_production',
    host: '127.0.0.1',
    dialect: 'mysql'
  }
};

module.exports = config;

