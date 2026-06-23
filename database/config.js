const { Sequelize } = require('sequelize');
const pg = require('pg');
require('dotenv').config({ path: '../.env' });

const mustUseSSL =
  (process.env.DB_SSL && ['true', '1', 'yes'].includes(String(process.env.DB_SSL).toLowerCase())) ||
  /neon\.tech/i.test(process.env.DB_HOST || '') ||
  /render\.com/i.test(process.env.DB_HOST || '') ||
  /aws\.com/i.test(process.env.DB_HOST || '');

const commonOpts = {
  dialect: 'postgres',
  dialectModule: pg,
  logging: false,
  dialectOptions: mustUseSSL
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
};

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, commonOpts)
  : new Sequelize(
      process.env.DB_NAME,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        ...commonOpts,
      }
    );

module.exports = sequelize;
