const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("MONGO_URI in db.js:", process.env.MONGO_URI); // Debug log
    await mongoose.connect(process.env.MONGO_URI); // no extra options needed
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ Error in connectDB:", err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
