const mongoose = require('mongoose');

/**
 * Connect to MongoDB using the MONGO_URI environment variable.
 * Exits the process on failure so we don't run a server without a DB.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error('MONGO_URI is not set. Copy .env.example to .env and fill it in.');
  }

  await mongoose.connect(uri);
  console.log('MongoDB connected');
  return mongoose.connection;
}

module.exports = connectDB;
