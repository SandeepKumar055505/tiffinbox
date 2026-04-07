// Vercel serverless entry point for TiffinBox backend
process.env.VERCEL = '1';

const { app } = require('../backend/dist/index');

module.exports = app;
