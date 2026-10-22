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

  // Step 2: Validate the token's user ID.
  if (
    typeof payload.sub !== "string" ||
    !mongoose.isValidObjectId(payload.sub)
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  // Step 3: Validate the token version.
  if (
    !Number.isSafeInteger(payload.tokenVersion) ||
    payload.tokenVersion < 0
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  try {
    // Step 4: Load the user's current security fields.
    const user = await User.findById(payload.sub)
      .select("role tokenVersion")
      .lean();

    // Step 5: Reject deleted users, stale roles, or revoked tokens.
    if (
      !user ||
      user.role !== payload.role ||
      (user.tokenVersion ?? 0) !== payload.tokenVersion
    ) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is no longer valid",
      });
    }

    // Step 6: Set the authenticated user's trusted identity.
      // Step 6: Set the authenticated user's trusted identity.
    req.user = {
      id: payload.sub,
      role: user.role,
      tokenVersion: user.tokenVersion ?? 0,
    };

    return next();
  } catch (error) {
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
