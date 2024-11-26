const express = require("express");
const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jwt-simple");
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
const redis = require("redis");
const rateLimit = require("express-rate-limit");
const User = require("./models/User"); // User model
const Rating = require("./models/Rating"); // Rating model
const SearchHistory = require("./models/SearchHistory"); // Search History model

dotenv.config();
const app = express();
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const JWT_SECRET = process.env.JWT_SECRET;

// Redis Client for caching
const client = redis.createClient();
client.on("error", (err) => console.log("Redis Client Error", err));

// Middleware
app.use(express.json());
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: "Too many requests, please try again later.",
  })
);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.log("MongoDB connection error:", err));

// Middleware to verify JWT token
function verifyToken(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(403).send("Access denied.");

  try {
    const decoded = jwt.decode(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).send("Invalid token.");
  }
}

// User Registration Endpoint
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;

  try {
    const existingUser = await User.findOne({ username });
    if (existingUser)
      return res.status(400).json({ message: "User already exists" });

    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: "User created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// User Login Endpoint
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    const payload = { userId: user._id };
    const token = jwt.encode(payload, JWT_SECRET);

    res.json({ token });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Movie Search Endpoint (with Caching)
app.get("/api/search", async (req, res) => {
  const { query } = req.query;
  if (!query)
    return res.status(400).json({ message: "Movie name is required" });

  // Check if result is cached in Redis
  client.get(query, async (err, cachedData) => {
    if (cachedData) {
      return res.json(JSON.parse(cachedData));
    }

    try {
      const response = await axios.get(
        `https://www.omdbapi.com/?t=${query}&apikey=${OMDB_API_KEY}`
      );
      if (response.data.Response === "True") {
        // Cache the result for 1 hour
        client.setex(query, 3600, JSON.stringify(response.data));
        return res.json(response.data);
      } else {
        return res.status(404).json({ message: "Movie not found" });
      }
    } catch (error) {
      return res.status(500).json({ message: "Error fetching movie data" });
    }
  });
});

// Submit Movie Rating (Authenticated)
app.post("/api/rate", verifyToken, async (req, res) => {
  const { movieId, rating } = req.body;
  const userId = req.user.userId;

  if (rating < 1 || rating > 10) {
    return res.status(400).json({ message: "Rating must be between 1 and 10" });
  }

  try {
    const userRating = new Rating({ movieId, rating, userId });
    await userRating.save();

    // Optionally, calculate and store the average rating for the movie
    const averageRating = await Rating.calculateAverageRating(movieId);

    res.json({ message: "Rating submitted", averageRating });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Record User Search History
app.post("/api/search-history", verifyToken, async (req, res) => {
  const { searchTerm } = req.body;
  const userId = req.user.userId;

  try {
    const searchHistory = new SearchHistory({ userId, searchTerm });
    await searchHistory.save();

    res.json({ message: "Search history recorded" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get User Search History
app.get("/api/search-history", verifyToken, async (req, res) => {
  const userId = req.user.userId;

  try {
    const history = await SearchHistory.find({ userId }).sort({
      timestamp: -1,
    });
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Error fetching search history" });
  }
});

// Start Server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
