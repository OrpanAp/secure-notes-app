
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");
const noteRoutes = require("./routes/noteRoutes");
const adminRoutes = require("./routes/adminRoutes");

const app = express();

// Security headers.
app.use(helmet());

// Restrict browser access to the configured client origin.
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Limit request body size.
app.use(express.json({ limit: "20kb" }));

// General API rate limit.
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  })
);

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Secure Notes API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/admin", adminRoutes);

// Handle unknown routes.
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Centralized error handler.
app.use((err, req, res, next) => {
  console.error("API error:", err.message);

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || 500).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
  });
});

module.exports = app;
