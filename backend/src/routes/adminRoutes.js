const express = require("express");
const { authenticate, requireRole } = require("../middleware/auth");

const {
  listUsers,
  listAllNotes,
  groupUsersByInterest,
  getUserPosts,
} = require("../controllers/adminController");

const router = express.Router();

// Every route below requires a valid JWT and the admin role.
router.use(authenticate, requireRole("admin"));

router.get("/users", listUsers);
router.get("/notes", listAllNotes);
router.get("/analytics/interests", groupUsersByInterest);
router.get("/users/:id/posts", getUserPosts);

module.exports = router;
