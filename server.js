require("dotenv").config();
const express = require("express");
const cors = require("cors");
const passport = require('passport');
const config = require('./src/config/config');
const connectDB = require('./src/utils/database');
const { jwtStrategy } = require('./src/config/passport');

const app = express();

// Passport configuration
passport.use('jwt', jwtStrategy);

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.use("/api/users", require("./src/routes/userRoutes"));
app.use("/api/queries", require("./src/routes/queryRoutes"));
app.use("/api/knowledge-base", require("./src/routes/knowledgeBaseRoutes"));

// Health check
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Knowledge Base System is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  if (err.name === "ValidationError") {
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors: Object.values(err.errors).map((e) => e.message),
    });
  }

  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: "Duplicate field value entered",
    });
  }

  res.status(500).json({
    success: false,
    message: "Server Error",
  });
});

// 404 handler - FIXED: Removed the problematic "*" pattern
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

const PORT = config.port;

// Connect to database
connectDB();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${config.env}`);
});