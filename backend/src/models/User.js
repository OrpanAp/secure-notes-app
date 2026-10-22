const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
      required: true,
    },
tokenVersion: {
  type: Number,
  default: 0,
  min: 0,
},
    interests: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Login lookup and duplicate-email prevention.
userSchema.index({ email: 1 }, { unique: true });

// Admin user listing with stable pagination.
userSchema.index({ createdAt: -1, _id: -1 });

module.exports = mongoose.model("User", userSchema);
