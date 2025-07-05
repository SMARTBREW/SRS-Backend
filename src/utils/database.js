// src/utils/database.js
const mongoose = require("mongoose");
const config = require('../config/config');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(
      config.mongoose.url,
      config.mongoose.options
    );
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Database connection error:", error);
    process.exit(1);
  }
};

module.exports = connectDB;
