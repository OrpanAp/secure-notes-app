const express = require("express");
const { authenticate } = require("../middleware/auth");
const {
  listNotes,
  createNote,
  getNote,
  updateNote,
  deleteNote,
} = require("../controllers/noteController");

const router = express.Router();

router.use(authenticate);

router.route("/")
  .get(listNotes)
  .post(createNote);

router.route("/:id")
  .get(getNote)
  .patch(updateNote)
  .delete(deleteNote);

module.exports = router;
