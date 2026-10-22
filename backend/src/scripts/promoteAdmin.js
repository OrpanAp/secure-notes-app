require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");

async function main() {
  const email = process.argv[2];

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      "Usage: node backend/src/scripts/promoteAdmin.js your-email@example.com"
    );
  }

  await connectDB();

  const user = await User.findOneAndUpdate(
    { email: email.trim().toLowerCase() },
    { $set: { role: "admin" } },
    { returnDocument: "after", runValidators: true }
  ).select("name email role");

  if (!user) {
    throw new Error(
      "No account found. Register this account normally before promoting it."
    );
  }

  console.log("Administrator role assigned successfully:");
  console.log({
    name: user.name,
    email: user.email,
    role: user.role,
  });
}

main()
  .catch((error) => {
    console.error("Admin promotion failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
