const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 50000 },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// User post lookup, sorting, and pagination.
postSchema.index({ author: 1, createdAt: -1, _id: -1 });

module.exports = mongoose.model("Post", postSchema);
