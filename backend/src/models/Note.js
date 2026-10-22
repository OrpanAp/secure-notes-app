const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 50000 },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// User's notes, sorted and paginated.
noteSchema.index({ owner: 1, createdAt: -1, _id: -1 });

// Admin's global notes list.
noteSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model("Note", noteSchema);
