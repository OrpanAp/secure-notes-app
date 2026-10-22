const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const User = require("../models/User");

async function authenticate(req, res, next) {
  const authorization = req.headers.authorization;

  if (!authorization || !authorization.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication token is required",
    });
  }

  const token = authorization.slice(7);

  let payload;

  // Step 1: Verify the JWT signature and expiration.
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }

  // Step 2: Ensure the token contains a valid MongoDB user ID.
  if (
    typeof payload.sub !== "string" ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  try {
    // Step 3: Read the user's current role from MongoDB.
    const user = await User.findById(payload.sub)
      .select("role")
      .lean();

    // Step 4: Reject deleted users or tokens with outdated roles.
    if (!user || user.role !== payload.role) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is no longer valid",
      });
    }

    // Step 5: Trust the verified, current database record.
    req.user = {
      id: payload.sub,
      role: user.role,
    };

    return next();
  } catch (error) {
    // Database errors should reach the application's error handler.
    return next(error);
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}

module.exports = { authenticate, requireRole };
