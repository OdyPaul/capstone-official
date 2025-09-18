const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log("MONGO_URI in db.js:", process.env.MONGO_URI);  // <-- Add this line for debug
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.error("Error in connectDB:", err);  // <-- Make sure err is defined here!
    process.exit(1);
  }
};

module.exports = connectDB;
