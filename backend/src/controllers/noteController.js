const mongoose = require("mongoose");
const Note = require("../models/Note");

function parsePagination(query) {
  function parsePositiveInteger(value, fallback) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^\\d+$/.test(value)) return null;

    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
  }

  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 10);

  if (page === null || limit === null || limit > 100) return null;

  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) return null;

  return { page, limit, skip };
}

function validText(value, maxLength) {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    value.length <= maxLength
  );
}

async function listNotes(req, res) {
  const pagination = parsePagination(req.query);

  if (!pagination) {
    return res.status(400).json({
      success: false,
      message: "Page must be positive and limit must be between 1 and 100",
    });
  }

  const filter = { owner: req.user.id };

  try {
    const [notes, total] = await Promise.all([
      Note.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      Note.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: notes,
      pagination: {
        page: pagination.page,
        limit: pagination.limit,
        total,
        totalPages: Math.ceil(total / pagination.limit),
      },
    });
  } catch (error) {
    console.error("List notes error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve notes",
    });
  }
}

async function createNote(req, res) {
  const { title, content } = req.body || {};

  if (
    !validText(title, 200) ||
    typeof content !== "string" ||
    !content.trim() ||
    content.length > 50000
  ) {
    return res.status(400).json({
      success: false,
      message: "A title (up to 200 characters) and content (up to 50000 characters) are required",
    });
  }

  try {
    const note = await Note.create({
      title: title.trim(),
      content,
      owner: req.user.id,
    });

    return res.status(201).json({ success: true, data: note });
  } catch (error) {
    console.error("Create note error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to create note",
    });
  }
}

async function getNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid note ID",
    });
  }

  try {
    const note = await Note.findOne({
      _id: req.params.id,
      owner: req.user.id,
    }).lean();

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.json({ success: true, data: note });
  } catch (error) {
    console.error("Get note error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to retrieve note",
    });
  }
}

async function updateNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid note ID",
    });
  }

  const updates = {};
  const fields = Object.keys(req.body || {});

  if (
    fields.length === 0 ||
    fields.some((field) => !["title", "content"].includes(field))
  ) {
    return res.status(400).json({
      success: false,
      message: "Provide title and/or content only",
    });
  }

  if ("title" in req.body) {
    if (!validText(req.body.title, 200)) {
      return res.status(400).json({
        success: false,
        message: "Title must be a non-empty string up to 200 characters",
      });
    }
    updates.title = req.body.title.trim();
  }

  if ("content" in req.body) {
    if (
      typeof req.body.content !== "string" ||
      !req.body.content.trim() ||
      req.body.content.length > 50000
    ) {
      return res.status(400).json({
        success: false,
        message: "Content must be a non-empty string up to 50000 characters",
      });
    }
    updates.content = req.body.content;
  }

  try {
    const note = await Note.findOneAndUpdate(
      { _id: req.params.id, owner: req.user.id },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.json({ success: true, data: note });
  } catch (error) {
    console.error("Update note error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to update note",
    });
  }
}

async function deleteNote(req, res) {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({
      success: false,
      message: "Invalid note ID",
    });
  }

  try {
    const note = await Note.findOneAndDelete({
      _id: req.params.id,
      owner: req.user.id,
    });

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    return res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Delete note error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Unable to delete note",
    });
  }
}

module.exports = {
  listNotes,
  createNote,
  getNote,
  updateNote,
  deleteNote,
};
