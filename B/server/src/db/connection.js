const mongoose = require("mongoose");

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL, {
            // Performance optimizations for MongoDB connection
            maxPoolSize: 10, // Maintain up to 10 socket connections
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            family: 4 // Use IPv4, skip trying IPv6
        });
        console.log("MongoDB Connected");
        return true;
    } catch (err) {
        console.log("Error:", err);
        return false;
    }
};

module.exports = connectDB;