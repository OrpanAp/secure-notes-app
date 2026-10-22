const express = require("express");
const User = require("../models/User");
const {
  register,
  login,
  logout,
} = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", authenticate, logout);

router.get("/me", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "name email role interests createdAt"
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account no longer exists",
      });
    }

    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        interests: user.interests,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Profile error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve profile",
    });
  }
});

module.exports = router;
